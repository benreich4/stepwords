#!/usr/bin/env node

import { chromium } from 'playwright';
import { execSync, spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { authenticateYouTube } from './setup-youtube-auth.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUZZLE_INPUT = process.argv[2];
const UPLOAD_TO_YOUTUBE = process.argv.includes('--upload-youtube');
const DELETE_AFTER_UPLOAD = process.argv.includes('--delete-after-upload');

if (!PUZZLE_INPUT) {
  console.error('Usage: npm run generate-video <puzzle-id> [--upload-youtube] [--delete-after-upload]');
  console.error('Example: npm run generate-video 1');
  console.error('Example: npm run generate-video quick/5');
  console.error('Example: npm run generate-video 1 --upload-youtube');
  console.error('Example: npm run generate-video quick/5 --upload-youtube --delete-after-upload');
  process.exit(1);
}

// Detect if it's a quick puzzle from input format (e.g., "quick/5" or "quick/67")
const IS_QUICK = PUZZLE_INPUT.startsWith('quick/');
const PUZZLE_ID = IS_QUICK ? PUZZLE_INPUT.replace('quick/', '') : PUZZLE_INPUT;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.join(__dirname, '..', 'autosolve_videos');
const OUTPUT_FILENAME = `autosolve-${IS_QUICK ? 'quick-' : ''}${PUZZLE_ID}-${Date.now()}.mov`;
const OUTPUT_PATH = path.join(OUTPUT_DIR, OUTPUT_FILENAME);
const PUZZLE_URL_WITHOUT_AUTOSOLVE = `${BASE_URL}/${IS_QUICK ? 'quick/' : ''}${PUZZLE_ID}?noanalytics=1`;
const PUZZLE_URL = `${BASE_URL}/${IS_QUICK ? 'quick/' : ''}${PUZZLE_ID}?autosolve=1&noanalytics=1`;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`Generating video for Stepwords ${IS_QUICK ? 'Quick' : 'Daily'} puzzle ${PUZZLE_ID}...`);
console.log(`URL: ${PUZZLE_URL}`);
console.log(`Output: ${OUTPUT_PATH}`);
if (UPLOAD_TO_YOUTUBE) {
  console.log('✓ Will upload to YouTube after generation');
}
if (DELETE_AFTER_UPLOAD) {
  if (!UPLOAD_TO_YOUTUBE) {
    console.error('❌ Error: --delete-after-upload requires --upload-youtube');
    process.exit(1);
  }
  console.log('✓ Will delete local video file after successful upload');
}

async function generateVideo() {
  const viewportWidth = 500;
  const viewportHeight = Math.round(viewportWidth * 16 / 9); // 889 for 9:16 aspect ratio
  
  // Window position
  const windowX = 200;
  const windowY = 200;
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--enable-gpu',
      '--enable-gpu-rasterization',
      '--enable-hardware-acceleration',
      '--enable-zero-copy',
      '--use-gl=desktop',
      '--enable-features=VaapiVideoDecoder',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-ipc-flooding-protection',
      '--disable-features=TranslateUI',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      `--window-size=${viewportWidth},${viewportHeight}`,
      `--window-position=${windowX},${windowY}`,
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
      bypassCSP: true,
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
    });

    const page = await context.newPage();

    console.log('Loading puzzle (without autosolve)...');
    await page.goto(PUZZLE_URL_WITHOUT_AUTOSOLVE, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for puzzle to load
    console.log('Waiting for puzzle to load...');
    await page.waitForFunction(() => {
      const bodyText = document.body.innerText || '';
      if (bodyText.includes('Loading…') || bodyText.includes('Loading')) return false;
      const grid = document.querySelector('[data-row-index="0"]');
      const letterBoxes = document.querySelectorAll('.letter-box');
      return grid && letterBoxes.length > 0;
    }, { timeout: 60000 });

    console.log('✓ Puzzle loaded, setting up screen recording...');

    // Get screen resolution and detect Retina scale factor
    let screenWidth, screenHeight, scaleFactor = 1;
    try {
      const screenInfo = execSync(`system_profiler SPDisplaysDataType`, { encoding: 'utf8' });
      const resolutionMatch = screenInfo.match(/Resolution:\s*(\d+)\s+x\s+(\d+)/);
      if (resolutionMatch) {
        screenWidth = parseInt(resolutionMatch[1]);
        screenHeight = parseInt(resolutionMatch[2]);
      }
      const isRetina = screenInfo.toLowerCase().includes('retina');
      const uiLooksLikeMatch = screenInfo.match(/UI Looks like:\s*(\d+)\s+x\s+(\d+)/);
      if (uiLooksLikeMatch && isRetina) {
        const logicalWidth = parseInt(uiLooksLikeMatch[1]);
        scaleFactor = screenWidth / logicalWidth;
        console.log(`Screen: ${screenWidth}x${screenHeight} (physical pixels)`);
        console.log(`Retina scale factor: ${scaleFactor}x`);
      } else if (isRetina) {
        scaleFactor = 2;
        console.log(`Screen: ${screenWidth}x${screenHeight} (physical pixels)`);
        console.log(`Retina display detected, using ${scaleFactor}x scale factor`);
      } else {
        scaleFactor = 1;
        console.log(`Screen: ${screenWidth}x${screenHeight} (non-Retina)`);
      }
      if (!screenWidth || !screenHeight) {
        throw new Error('Could not parse resolution');
      }
    } catch (error) {
      console.warn('Could not get screen resolution, using defaults');
      screenWidth = 2560;
      screenHeight = 1440;
      scaleFactor = 2;
    }

    // Find screen device index for FFmpeg
    let screenIndex = null;
    try {
      execSync('which ffmpeg', { encoding: 'utf8', stdio: 'pipe' });
      const result = spawnSync('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      const listOutput = (result.stderr || result.stdout || '').toString();
      const lines = listOutput.split('\n');
      let inVideoDevices = false;
      const videoDevices = [];
      
      for (const line of lines) {
        if (line.includes('AVFoundation video devices')) {
          inVideoDevices = true;
          continue;
        }
        if (inVideoDevices && line.includes('AVFoundation audio devices')) {
          break;
        }
        if (inVideoDevices && line.includes('[')) {
          const match = line.match(/\[(\d+)\]\s+(.+)/);
          if (match) {
            const index = match[1];
            const name = match[2].toLowerCase();
            const fullName = match[2];
            videoDevices.push({ index, name, fullName });
            
            if ((name.includes('screen') || name.includes('display') || name.includes('capture screen')) &&
                !name.includes('camera') && !name.includes('webcam') && !name.includes('facetime') && !name.includes('isight')) {
              screenIndex = index;
              console.log(`  → Selected screen device: [${screenIndex}] - ${fullName}`);
            }
          }
        }
      }
      
      if (!screenIndex && videoDevices.length > 0) {
        const nonCameraDevice = videoDevices.find(d => 
          !d.name.includes('camera') && !d.name.includes('webcam') && !d.name.includes('facetime') && !d.name.includes('isight')
        );
        if (nonCameraDevice) {
          screenIndex = nonCameraDevice.index;
        }
      }
      
      if (!screenIndex) {
        throw new Error('Could not find screen capture device');
      }
      console.log(`✓ Using screen device index: ${screenIndex}`);
    } catch (error) {
      console.error('❌ Could not find screen capture device:', error.message);
      throw error;
    }

    // Use absolute path for output
    const absoluteOutputPath = path.resolve(OUTPUT_PATH);
    const tempOutputPath = absoluteOutputPath.replace('.mov', '-fullscreen.mov');
    
    console.log('\n=== Starting FFmpeg screen recording ===');
    console.log(`Recording full screen - will crop to window in post-processing`);
    
    // Test device format
    const deviceFormats = [`${screenIndex}:none`, `"Capture screen ${screenIndex}":none`, `"${screenIndex}":none`];
    let deviceFormat = deviceFormats[0];
    let testSuccess = false;
    const testOutputPath = path.join(OUTPUT_DIR, 'test-recording.mov');
    
    for (const format of deviceFormats) {
      try {
        const testProcess = spawn('ffmpeg', [
          '-f', 'avfoundation',
          '-framerate', '30.0',
          '-i', format,
          '-t', '1',
          '-c:v', 'prores_ks',
          '-profile:v', '3',
          '-pix_fmt', 'yuv422p10le',
          '-y',
          testOutputPath
        ], { stdio: 'pipe' });
        
        await new Promise((resolve) => {
          testProcess.on('close', (code) => {
            if (fs.existsSync(testOutputPath) && fs.statSync(testOutputPath).size > 0) {
              fs.unlinkSync(testOutputPath);
              deviceFormat = format;
              testSuccess = true;
              console.log(`✓ Screen capture device test successful`);
            }
            resolve();
          });
          setTimeout(() => {
            if (!testProcess.killed) {
              testProcess.kill('SIGKILL');
              resolve();
            }
          }, 3000);
        });
        
        if (testSuccess) break;
      } catch (error) {
        continue;
      }
    }
    
    if (!testSuccess) {
      throw new Error('Screen capture device not accessible');
    }
    
    const ffmpegArgs = [
      '-f', 'avfoundation',
      '-framerate', '60.0',
      '-i', deviceFormat,
      '-c:v', 'qtrle',
      '-pix_fmt', 'argb',
      '-r', '60',
      '-movflags', '+faststart',
      '-threads', '0',
      '-y',
      tempOutputPath
    ];
    
    console.log(`Recording at 60fps with Apple Animation codec (qtrle)...`);
    
    let ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    setTimeout(() => {
      try {
        if (ffmpegProcess.pid) {
          execSync(`renice -n 10 -p ${ffmpegProcess.pid}`, { stdio: 'pipe' });
        }
      } catch (error) {
        // Non-critical
      }
    }, 1000);
    
    let ffmpegError = '';
    let ffmpegStarted = false;
    
    ffmpegProcess.stderr.on('data', (data) => {
      const line = data.toString();
      ffmpegError += line;
      
      if (line.includes('frame=') || line.includes('Stream #0') || line.includes('Output #0')) {
        if (!ffmpegStarted) {
          ffmpegStarted = true;
          console.log('\n✓ FFmpeg recording started');
        }
      }
      
      // Check for framerate errors and warn
      if (line.includes('framerate') && line.includes('not supported')) {
        console.warn('⚠️  Note: Framerate may not be exactly 60fps, but recording continues');
      }
    });
    
    // Wait for FFmpeg to start
    console.log('Waiting for FFmpeg to start recording...');
    let waitAttempts = 0;
    while (!ffmpegStarted && waitAttempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waitAttempts++;
    }
    
    if (!ffmpegStarted) {
      ffmpegProcess.kill('SIGKILL');
      console.error('FFmpeg stderr:', ffmpegError);
      throw new Error('FFmpeg failed to start recording');
    }
    
    // Now trigger autosolve
    console.log('\n=== Starting autosolve ===');
    await page.goto(PUZZLE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✓ Autosolve started - recording is active');

    // Wait for autosolve to complete
    try {
      await page.waitForFunction(() => {
        return document.body.innerText.includes('Can you solve the last answer?');
      }, { timeout: 180000 });
      console.log('✓ Autosolve completed');
      await page.waitForTimeout(1500);
      await page.waitForTimeout(5000);
    } catch (error) {
      console.warn('Could not detect completion, waiting fixed time:', error.message);
      await page.waitForTimeout(60000);
      await page.waitForTimeout(1500);
      await page.waitForTimeout(5000);
    }
    
    // Stop FFmpeg recording
    console.log('Stopping FFmpeg recording...');
    try {
      if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
        ffmpegProcess.stdin.write('q\n');
        ffmpegProcess.stdin.end();
      } else {
        ffmpegProcess.kill('SIGINT');
      }
    } catch (error) {
      ffmpegProcess.kill('SIGINT');
    }
    
    const stopPromise = new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('⚠️  FFmpeg stop timeout - file may still be finalizing');
          resolve();
        }
      }, 30000);
      
      ffmpegProcess.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          if (code === 0 || code === null) {
            console.log('✓ FFmpeg recording stopped gracefully');
          } else {
            console.warn(`⚠️  FFmpeg exited with code ${code} - file may still be valid`);
          }
          resolve();
        }
      });
      
      ffmpegProcess.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.error('❌ FFmpeg process error:', error.message);
          resolve();
        }
      });
    });
    
    await stopPromise;
    
    // Log final FFmpeg error output for debugging
    if (ffmpegError) {
      const errorLines = ffmpegError.split('\n').filter(line => 
        line.toLowerCase().includes('error') || 
        line.toLowerCase().includes('failed') ||
        line.toLowerCase().includes('invalid')
      );
      if (errorLines.length > 0) {
        console.warn('FFmpeg warnings/errors:');
        errorLines.slice(0, 5).forEach(line => console.warn('  ', line.trim()));
      }
    }
    
    // Wait longer for qtrle files to finalize
    console.log('Waiting for file to finalize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Closing browser...');
    await page.close();
    await context.close();
    
    // Wait for file to be ready
    console.log('Waiting for recording file to be finalized...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Longer initial wait
    
    let fileReady = false;
    let fileWaitAttempts = 0;
    const maxWaitAttempts = 40; // 20 seconds total
    
    while (!fileReady && fileWaitAttempts < maxWaitAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      fileWaitAttempts++;
      
      if (fs.existsSync(tempOutputPath)) {
        const stats = fs.statSync(tempOutputPath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(1);
        
        // Check file size first - should be substantial for a real recording
        if (stats.size < 1024 * 1024) { // Less than 1MB is suspicious
          if (fileWaitAttempts % 4 === 0) {
            console.log(`  Waiting for file to grow... (${fileWaitAttempts * 0.5}s, size: ${fileSizeMB}MB)`);
          }
          continue;
        }
        
        try {
          // Try to probe the file - use less strict options for qtrle
          const probeResult = spawnSync('ffprobe', [
            '-v', 'warning', // Use warning instead of error for more info
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,r_frame_rate',
            '-of', 'json',
            tempOutputPath
          ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
          
          if (probeResult.status === 0 && probeResult.stdout) {
            try {
              const probeData = JSON.parse(probeResult.stdout);
              if (probeData.streams && probeData.streams[0]) {
                const stream = probeData.streams[0];
                if (stream.width && stream.height) {
                  fileReady = true;
                  console.log(`✓ Recording file is ready (${stream.width}x${stream.height}, ${fileSizeMB}MB)`);
                  break;
                }
              }
            } catch (parseError) {
              // JSON parse failed, but file exists - might still be writing
              if (fileWaitAttempts % 4 === 0) {
                console.log(`  File exists but not fully readable yet... (${fileWaitAttempts * 0.5}s, size: ${fileSizeMB}MB)`);
              }
            }
          } else {
            // Probe failed, but check if file is still growing
            const newStats = fs.statSync(tempOutputPath);
            if (newStats.size > stats.size) {
              // File is still growing, continue waiting
              if (fileWaitAttempts % 4 === 0) {
                console.log(`  File still being written... (${fileWaitAttempts * 0.5}s, size: ${fileSizeMB}MB)`);
              }
            } else {
              // File size stable but probe failed - might be corrupted
              if (fileWaitAttempts % 4 === 0) {
                console.log(`  File size stable but probe failed... (${fileWaitAttempts * 0.5}s, size: ${fileSizeMB}MB)`);
                if (probeResult.stderr) {
                  console.log(`  Probe error: ${probeResult.stderr.toString().substring(0, 200)}`);
                }
              }
            }
          }
        } catch (error) {
          // Continue waiting
          if (fileWaitAttempts % 4 === 0) {
            console.log(`  Error probing file... (${fileWaitAttempts * 0.5}s, size: ${fileSizeMB}MB)`);
          }
        }
      } else {
        if (fileWaitAttempts % 4 === 0) {
          console.log(`  File does not exist yet... (${fileWaitAttempts * 0.5}s)`);
        }
      }
    }
    
    if (!fileReady) {
      // Provide detailed error information
      if (fs.existsSync(tempOutputPath)) {
        const stats = fs.statSync(tempOutputPath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(1);
        console.error(`❌ Recording file validation failed`);
        console.error(`File exists: ${tempOutputPath}`);
        console.error(`File size: ${stats.size} bytes (${fileSizeMB}MB)`);
        console.error(`File modified: ${new Date(stats.mtimeMs).toISOString()}`);
        
        // Try one more probe with verbose output
        console.log('\nAttempting detailed probe...');
        const verboseProbe = spawnSync('ffprobe', [
          '-v', 'info',
          tempOutputPath
        ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        
        if (verboseProbe.stderr) {
          console.error('FFprobe output:', verboseProbe.stderr.toString().substring(0, 500));
        }
        
        // Try to fix the file by re-encoding
        console.log('\nAttempting to fix file by re-encoding...');
        const fixPath = tempOutputPath.replace('.mov', '-fixed.mov');
        try {
          const fixResult = spawnSync('ffmpeg', [
            '-i', tempOutputPath,
            '-c:v', 'copy', // Try to copy stream without re-encoding
            '-y',
            fixPath
          ], { encoding: 'utf8', stdio: 'inherit' });
          
          if (fs.existsSync(fixPath) && fs.statSync(fixPath).size > 0) {
            fs.renameSync(fixPath, tempOutputPath);
            console.log('✓ File fixed, continuing...');
            fileReady = true;
          }
        } catch (fixError) {
          console.error('Could not fix file:', fixError.message);
        }
      } else {
        console.error(`❌ Recording file does not exist: ${tempOutputPath}`);
      }
      
      if (!fileReady) {
        throw new Error('Recording file is not valid or not ready. Check FFmpeg output above for details.');
      }
    }
    
    // Crop the video
    if (fs.existsSync(tempOutputPath)) {
      console.log('\n=== Cropping video ===');
      
      const menuBarHeightPoints = 25;
      const titleBarHeightPoints = 28;
      const menuBarHeightPixels = Math.round(menuBarHeightPoints * scaleFactor);
      const titleBarHeightPixels = Math.round(titleBarHeightPoints * scaleFactor);
      const windowXPixels = Math.round(windowX * scaleFactor);
      const windowYPixels = Math.round(windowY * scaleFactor);
      const viewportWidthPixels = Math.round(viewportWidth * scaleFactor);
      const viewportHeightPixels = Math.round(viewportHeight * scaleFactor);
      
      const cropX = windowXPixels;
      const cropY = windowYPixels + menuBarHeightPixels + titleBarHeightPixels;
      const cropWidth = viewportWidthPixels;
      const cropHeight = viewportHeightPixels;
      
      console.log(`Crop coordinates: x=${cropX}, y=${cropY}, width=${cropWidth}, height=${cropHeight}`);
      
      const croppedPath = absoluteOutputPath.replace('.mov', '-cropped.mov');
      const cropArgs = [
        '-ss', '1',
        '-i', tempOutputPath,
        '-vf', `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`,
        '-c:v', 'prores_ks',
        '-profile:v', '4444',
        '-pix_fmt', 'yuva444p10le',
        '-qscale:v', '0',
        '-fps_mode', 'cfr',
        '-r', '60',
        '-sws_flags', 'lanczos+accurate_rnd+full_chroma_int',
        '-y',
        croppedPath
      ];
      
      console.log('Cropping and converting to ProRes 4444 (trimming first second)...');
      
      const cropResult = spawnSync('ffmpeg', cropArgs, { encoding: 'utf8', stdio: 'inherit' });
      
      if (!fs.existsSync(croppedPath) || fs.statSync(croppedPath).size === 0) {
        throw new Error('Crop produced empty file');
      }
      
      console.log(`✓ Cropped video saved`);
      
      // Add music
      console.log('\n=== Adding music ===');
      const musicPath = path.join(OUTPUT_DIR, 'just-smile-by-liqwyd.mp3');
      
      if (!fs.existsSync(musicPath)) {
        console.warn(`⚠️  Music file not found: ${musicPath}`);
        console.warn('Saving video without music');
        fs.renameSync(croppedPath, absoluteOutputPath);
      } else {
        const mixArgs = [
          '-i', croppedPath,
          '-i', musicPath,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          '-y',
          absoluteOutputPath
        ];
        
        console.log('Mixing audio...');
        const mixResult = spawnSync('ffmpeg', mixArgs, { encoding: 'utf8', stdio: 'inherit' });
        
        if (fs.existsSync(absoluteOutputPath) && fs.statSync(absoluteOutputPath).size > 0) {
          fs.unlinkSync(croppedPath);
          fs.unlinkSync(tempOutputPath);
          console.log(`✅ Video with music saved: ${absoluteOutputPath}`);
        } else {
          throw new Error('Music mixing failed');
        }
      }
    } else {
      throw new Error('Fullscreen recording file not found');
    }

    // Upload to YouTube if requested
    if (UPLOAD_TO_YOUTUBE && fs.existsSync(absoluteOutputPath)) {
      console.log('\n=== Uploading to YouTube ===');
      const uploadSuccess = await uploadToYouTube(absoluteOutputPath, PUZZLE_ID, IS_QUICK);
      
      // Delete local file if upload was successful and flag is set
      if (uploadSuccess && DELETE_AFTER_UPLOAD) {
        console.log('\n=== Deleting local video file ===');
        try {
          fs.unlinkSync(absoluteOutputPath);
          console.log(`✅ Deleted local file: ${absoluteOutputPath}`);
        } catch (error) {
          console.error(`❌ Failed to delete local file: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function uploadToYouTube(videoPath, puzzleId, isQuick) {
  try {
    console.log('Authenticating with YouTube...');
    const auth = await authenticateYouTube();
    
    const youtube = google.youtube({
      version: 'v3',
      auth: auth,
    });
    
    // Load puzzle data to get date
    let puzzleDate = null;
    let dateFormatted = null;
    try {
      const manifestPath = path.join(__dirname, '..', 'public', 'puzzles', 'index.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const puzzleMeta = manifest.find(p => String(p.id) === String(puzzleId));
        if (puzzleMeta && puzzleMeta.date) {
          puzzleDate = puzzleMeta.date;
          // Format date with day of week: "Monday, September 4, 2025"
          const [y, m, d] = puzzleDate.split('-').map(v => parseInt(v, 10));
          const dateObj = new Date(y, m - 1, d);
          dateFormatted = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
        }
      }
    } catch (error) {
      console.warn('Could not load puzzle date:', error.message);
    }
    
    // Generate title with day and date - include # before puzzle number
    const title = dateFormatted 
      ? isQuick 
        ? `Quick Stepword Puzzle #${puzzleId} – quick puzzle for ${dateFormatted}`
        : `Stepword Puzzle #${puzzleId} – main puzzle for ${dateFormatted}`
      : isQuick
        ? `Quick Stepword Puzzle #${puzzleId}`
        : `Stepword Puzzle #${puzzleId}`;
    
    // Description with rules explanation, music attribution, and hashtags
    const description = `Play daily at https://stepwords.xyz
Play this puzzle here: https://stepwords.xyz${isQuick ? '/quick' : ''}/${puzzleId}

How to play Stepwords:
Each answer is an anagram of the previous answer plus one additional letter. Each answer has a crossword-style clue. The stepladder emoji indicates the location of the new letter. 

New Main and Quick puzzles are uploaded each midnight ET. Puzzles get progressively harder throughout the week. How long of a streak can you maintain?

If you're stuck, try using a hint or jumping ahead!

--------
Music: "Just Smile" by LiQWYD | https://www.liqwydmusic.com
Creative Commons / Attribution 3.0 Unported License (CC BY 3.0)

#stepwords #stepwordpuzzle #stepwordpuzzles #crosswords #crosswordpuzzle #crosswordpuzzles #wordgames #wordgame #anagram #anagrams #wordle #shorts`;
    
    const tags = [
      'stepwords',
      'word puzzle',
      'autosolve',
      'puzzle game',
      'word game',
      isQuick ? 'quick puzzle' : 'daily puzzle'
    ];
    
    console.log(`Title: ${title}`);
    console.log(`Description length: ${description.length} characters`);
    console.log(`Tags: ${tags.join(', ')}`);
    
    const fileSizeMB = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1);
    console.log(`File size: ${fileSizeMB}MB`);
    console.log('Uploading... (this may take a while)\n');
    
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title,
          description: description,
          tags: tags,
          categoryId: '24', // Entertainment category
        },
        status: {
          privacyStatus: 'public', // Must be 'unlisted' or 'public' for comments to work
          selfDeclaredMadeForKids: false, // Not made for kids
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });
    
    console.log('✓ Video uploaded with settings: Not made for kids');
    
    const videoId = response.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log('\n✅ Video uploaded successfully to YouTube!');
    console.log(`Video ID: ${videoId}`);
    console.log(`URL: ${videoUrl}`);
    console.log(`Privacy: private (change in YouTube Studio if needed)`);
    
    // Add video to appropriate playlist
    try {
      console.log('\nAdding video to playlist...');
      const playlistName = isQuick ? 'Quick Stepword Puzzles' : 'Main Stepword Puzzles';
      
      // Search for the playlist by name
      const playlistSearch = await youtube.playlists.list({
        part: ['snippet', 'id'],
        mine: true,
        maxResults: 50,
      });
      
      let playlistId = null;
      for (const playlist of playlistSearch.data.items || []) {
        if (playlist.snippet.title === playlistName) {
          playlistId = playlist.id;
          console.log(`✓ Found playlist: ${playlistName} (ID: ${playlistId})`);
          break;
        }
      }
      
      // Create playlist if it doesn't exist
      if (!playlistId) {
        console.log(`Creating playlist: ${playlistName}...`);
        const createPlaylistResponse = await youtube.playlists.insert({
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: playlistName,
              description: isQuick 
                ? 'All Quick Stepword puzzle solution videos'
                : 'All Main Stepword puzzle solution videos',
            },
            status: {
              privacyStatus: 'public',
            },
          },
        });
        playlistId = createPlaylistResponse.data.id;
        console.log(`✓ Created playlist: ${playlistName} (ID: ${playlistId})`);
      }
      
      // Add video to playlist
      await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId,
            },
          },
        },
      });
      
      console.log(`✓ Video added to playlist: ${playlistName}`);
      
    } catch (playlistError) {
      console.warn('⚠️  Could not add video to playlist:', playlistError.message);
      console.warn('Video uploaded successfully, but playlist addition failed');
      // Don't fail the upload if playlist addition fails
    }
    
    // Add pinned comment asking for final answer
    try {
      console.log('\nAdding pinned comment...');
      const commentText = `Leave a comment with the final answer!

Play this puzzle: https://stepwords.xyz${isQuick ? '/quick' : ''}/${puzzleId}`;
      
      const videoDetails = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId],
      });
      
      const channelId = videoDetails.data.items[0]?.snippet?.channelId;
      if (!channelId) {
        throw new Error('Could not get channel ID from video');
      }
      
      const commentResponse = await youtube.commentThreads.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            channelId: channelId,
            videoId: videoId,
            topLevelComment: {
              snippet: {
                textOriginal: commentText,
              },
            },
          },
        },
      });
      
      const commentId = commentResponse.data.id;
      console.log(`✓ Comment added (ID: ${commentId})`);
      
      // Note: YouTube API doesn't directly support pinning comments via API
      // The comment will need to be pinned manually in YouTube Studio
      console.log('💡 Note: To pin this comment, go to YouTube Studio → Comments → Find this comment → Pin');
      console.log(`   Comment text: "${commentText.substring(0, 50)}..."`);
      
    } catch (commentError) {
      console.warn('⚠️  Could not add comment:', commentError.message);
      if (commentError.message.includes('insufficient permissions') || commentError.message.includes('authorized')) {
        console.warn('\n📋 To fix this:');
        console.warn('1. Delete the token file: rm youtube-token.json');
        console.warn('2. Re-authenticate: npm run setup-youtube');
        console.warn('3. This will request the comment permission');
      }
      console.warn('Video uploaded successfully, but comment was not added');
      // Don't fail the upload if comment fails
    }
    
    return true; // Return success
    
  } catch (error) {
    console.error('\n❌ YouTube upload failed:', error.message);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    // Don't throw - allow script to complete even if upload fails
    console.warn('Continuing... (video file is still saved locally)');
    return false; // Return failure
  }
}

generateVideo()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
