#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUZZLE_ID = process.argv[2];
const IS_QUICK = process.argv.includes('--quick') || process.env.IS_QUICK === 'true';
const UPLOAD_TO_YOUTUBE = process.argv.includes('--upload') || process.env.UPLOAD_TO_YOUTUBE === 'true';
const OUTPUT_DIR = path.join(__dirname, '..', 'autosolve_videos');
const OUTPUT_FILENAME = `autosolve-${IS_QUICK ? 'quick-' : ''}${PUZZLE_ID}-${Date.now()}.webm`;
const OUTPUT_PATH = path.join(OUTPUT_DIR, OUTPUT_FILENAME);

if (!PUZZLE_ID) {
  console.error('Usage: npm run generate-video <puzzle-id> [--quick] [--upload]');
  console.error('Example: npm run generate-video 1 -- --upload');
  console.error('Example: npm run generate-video 1 --quick -- --upload');
  process.exit(1);
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const PUZZLE_URL = `${BASE_URL}/${IS_QUICK ? 'quick/' : ''}${PUZZLE_ID}?autosolve=1`;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`Generating autosolve video for puzzle ${PUZZLE_ID}...`);
console.log(`URL: ${PUZZLE_URL}`);
console.log(`Output: ${OUTPUT_PATH}`);
if (UPLOAD_TO_YOUTUBE) {
  console.log('YouTube upload enabled.');
}

async function generateVideo() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--force-device-scale-factor=3',
      '--high-dpi-support=1',
    ]
  });

  try {
    const viewportWidth = 390;
    const viewportHeight = 844;
    const deviceScaleFactor = 3;
    
    // Record at the actual rendered resolution (viewport * deviceScaleFactor)
    // This ensures we capture the crisp high-DPI rendering
    const recordWidth = viewportWidth * deviceScaleFactor;
    const recordHeight = viewportHeight * deviceScaleFactor;
    
    // First, create a context WITHOUT recording to load the puzzle
    const loadContext = await browser.newContext({
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: deviceScaleFactor
      },
      timeout: 300000
    });

    const loadPage = await loadContext.newPage();

    console.log('Loading puzzle page...');
    await loadPage.goto(PUZZLE_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for puzzle to be fully loaded and ready
    console.log('Waiting for puzzle to load...');
    await loadPage.waitForFunction(() => {
      // First, check that "Loading…" text is gone
      const bodyText = document.body.innerText || '';
      if (bodyText.includes('Loading…') || bodyText.includes('Loading')) {
        return false;
      }
      
      // Check if the game grid is visible and has content
      const grid = document.querySelector('[data-row-index="0"]');
      const letterBoxes = document.querySelectorAll('.letter-box');
      if (!grid || letterBoxes.length === 0) {
        return false;
      }
      
      // Check that the game container has its background set
      const gameContainer = document.querySelector('[class*="bg-black"], [class*="bg-white"]');
      if (!gameContainer) {
        return false;
      }
      
      const computedStyle = window.getComputedStyle(gameContainer);
      const bgColor = computedStyle.backgroundColor;
      const isSet = bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
      
      return isSet;
    }, {
      timeout: 60000
    });
    
    // Wait for React to fully hydrate and all components to be ready
    await loadPage.waitForFunction(() => {
      // Check that autosolve mode is active (if applicable)
      const urlParams = new URLSearchParams(window.location.search || '');
      const autosolveActive = urlParams.get('autosolve') === '1';
      
      // Ensure all letter boxes are rendered
      const allRows = document.querySelectorAll('[data-row-index]');
      if (allRows.length === 0) return false;
      
      // Check that the first row has all its letter boxes
      const firstRow = document.querySelector('[data-row-index="0"]');
      if (!firstRow) return false;
      
      const firstRowBoxes = firstRow.querySelectorAll('.letter-box');
      const expectedLength = parseInt(firstRow.getAttribute('data-row-length') || '0');
      if (expectedLength > 0 && firstRowBoxes.length !== expectedLength) {
        return false;
      }
      
      return true;
    }, {
      timeout: 60000
    });
    
    // Wait for any initial animations/transitions to complete
    await loadPage.waitForTimeout(2000);
    
    console.log('✓ Puzzle fully loaded and ready, starting video recording...');
    
    // Now create a new context WITH recording and navigate to the same page
    // The puzzle should load faster this time since it's cached
    const context = await browser.newContext({
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: deviceScaleFactor
      },
      recordVideo: {
        dir: path.dirname(OUTPUT_PATH),
        size: { width: recordWidth, height: recordHeight }
      },
      timeout: 300000
    });

    const page = await context.newPage();

    console.log('Navigating to puzzle page for recording...');
    // Use 'domcontentloaded' instead of 'networkidle' for faster loading from cache
    await page.goto(PUZZLE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for puzzle to be ready again (should be instant from cache)
    // Make sure "Loading…" text is gone and puzzle is fully rendered
    await page.waitForFunction(() => {
      // First, check that "Loading…" text is gone
      const bodyText = document.body.innerText || '';
      if (bodyText.includes('Loading…') || bodyText.includes('Loading')) {
        return false;
      }
      
      // Check if the game grid is visible and has content
      const grid = document.querySelector('[data-row-index="0"]');
      const letterBoxes = document.querySelectorAll('.letter-box');
      if (!grid || letterBoxes.length === 0) {
        return false;
      }
      
      // Check that the game container has its background set
      const gameContainer = document.querySelector('[class*="bg-black"], [class*="bg-white"]');
      if (!gameContainer) {
        return false;
      }
      
      const computedStyle = window.getComputedStyle(gameContainer);
      const bgColor = computedStyle.backgroundColor;
      const isSet = bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
      
      // Ensure all rows are rendered
      const allRows = document.querySelectorAll('[data-row-index]');
      if (allRows.length === 0) return false;
      
      return isSet;
    }, {
      timeout: 60000
    });
    
    // Wait for React to fully hydrate and all components to be ready
    await page.waitForFunction(() => {
      // Ensure all letter boxes are rendered
      const allRows = document.querySelectorAll('[data-row-index]');
      if (allRows.length === 0) return false;
      
      // Check that the first row has all its letter boxes
      const firstRow = document.querySelector('[data-row-index="0"]');
      if (!firstRow) return false;
      
      const firstRowBoxes = firstRow.querySelectorAll('.letter-box');
      if (firstRowBoxes.length === 0) return false;
      
      return true;
    }, {
      timeout: 60000
    });
    
    // Wait for any initial animations/transitions to complete
    await page.waitForTimeout(1500);
    
    console.log('✓ Recording started, puzzle is ready');
    
    console.log('✓ Recording started, waiting for autosolve to complete...');
    
    // Close the loading context
    await loadContext.close();

    // Wait for autosolve to complete

    // Wait for autosolve to complete
    try {
      await page.waitForFunction(() => {
        const bodyText = document.body.innerText || '';
        return bodyText.includes('Can you solve the last answer?');
      }, {
        timeout: 180000
      });
      console.log('✓ Autosolve completed');
      // Wait 3 seconds at the end before stopping recording
      await page.waitForTimeout(3000);
    } catch (error) {
      console.warn('Could not detect completion, waiting fixed time:', error.message);
      await page.waitForTimeout(60000);
      // Also wait 3 seconds at the end even if we used fixed time
      await page.waitForTimeout(3000);
    }

    // Detect if it's a quick puzzle from the page before closing
    let isQuickPuzzle = IS_QUICK;
    try {
      isQuickPuzzle = await page.evaluate(() => {
        // Check URL to determine if it's a quick puzzle
        const url = window.location.href;
        return url.includes('/quick/');
      });
    } catch (e) {
      // If detection fails, use the command line flag
      isQuickPuzzle = IS_QUICK;
    }

    console.log('Closing page to finalize video...');
    const video = page.video();
    await page.close();
    await new Promise(resolve => setTimeout(resolve, 1000));

    let finalVideoPath = null;

    if (video) {
      const tempVideoPath = await video.path();
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        // Trim the first 5 frames - use frame-accurate re-encoding method
        const trimmedVideoPath = tempVideoPath.replace('.webm', '-trimmed.webm');
        console.log('Removing first 5 frames...');
        try {
          // Use -ss after input for frame-accurate seeking (decodes first, then seeks)
          // At 60fps, 5 frames = 5/60 = 0.08333 seconds
          // Re-encode with high quality to minimize quality loss
          const trimCommand = `ffmpeg -i "${tempVideoPath}" -ss 0.08333 -c:v libvpx-vp9 -crf 18 -b:v 0 -preset fast -c:a copy -y "${trimmedVideoPath}"`;
          execSync(trimCommand, { stdio: 'inherit' });
          fs.unlinkSync(tempVideoPath);
          console.log('✓ First 5 frames removed');
        } catch (error) {
          console.warn('Failed to trim frames, using original:', error.message);
          if (fs.existsSync(trimmedVideoPath)) {
            fs.unlinkSync(trimmedVideoPath);
          }
        }
        
        const videoToProcess = fs.existsSync(trimmedVideoPath) ? trimmedVideoPath : tempVideoPath;
        
        // Add background music using FFmpeg
        const musicPath = path.join(__dirname, '..', 'autosolve_videos', 'just-smile-by-liqwyd.mp3');

        if (fs.existsSync(musicPath)) {
          console.log('Adding background music...');
          try {
            const ffmpegCommand = `ffmpeg -i "${videoToProcess}" -i "${musicPath}" -c:v copy -c:a libopus -b:a 128k -shortest -y "${OUTPUT_PATH}"`;
            execSync(ffmpegCommand, { stdio: 'inherit' });
            if (fs.existsSync(trimmedVideoPath)) fs.unlinkSync(trimmedVideoPath);
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
            finalVideoPath = OUTPUT_PATH;
            console.log(`✅ Video with music saved to: ${finalVideoPath}`);
          } catch (error) {
            console.warn('Failed to add music, saving video without audio:', error.message);
            fs.copyFileSync(videoToProcess, OUTPUT_PATH);
            if (fs.existsSync(trimmedVideoPath)) fs.unlinkSync(trimmedVideoPath);
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
            finalVideoPath = OUTPUT_PATH;
          }
        } else {
          console.warn(`Music file not found at ${musicPath}, saving video without music`);
          fs.copyFileSync(videoToProcess, OUTPUT_PATH);
          if (fs.existsSync(trimmedVideoPath)) fs.unlinkSync(trimmedVideoPath);
          if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
          finalVideoPath = OUTPUT_PATH;
        }

        const stats = fs.statSync(finalVideoPath);
        console.log(`   File size: ${Math.round(stats.size / 1024)}KB`);
      } else {
        throw new Error('Video file was not generated');
      }
    } else {
      throw new Error('Video recording was not available');
    }

    if (UPLOAD_TO_YOUTUBE && finalVideoPath) {
      console.log('Attempting to upload video to YouTube...');
      try {
        const { authenticateYouTube } = await import('./setup-youtube-auth.mjs');
        const { google } = await import('googleapis');
        
        const auth = await authenticateYouTube();
        const youtube = google.youtube({ version: 'v3', auth });

        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const puzzleType = isQuickPuzzle ? 'Quick Stepword Puzzle' : 'Main Stepword Puzzle';
        const title = `${puzzleType} #${PUZZLE_ID} - ${dateString}`;
        const description = `Check out ${puzzleType} #${PUZZLE_ID}!\n\nPlay Stepwords daily at https://stepwords.xyz\n\n#stepwordpuzzle #wordgames #anagram #anagrams #wordle #crosswords #crossword #crosswordpuzzle #shorts #stepwords\n\n─────────────────────\n\nMusic: Just Smile by LiQWYD https://soundcloud.com/liqwyd\nCreative Commons — Attribution 3.0 Unported — CC BY 3.0\nFree Download / Stream: https://www.audiolibrary.com.co/LiQWYD/just-smile\nMusic promoted by Audio Library https://youtu.be/lMGw8bTCBww`;
        const tags = ['stepwords', 'stepword puzzle', 'word game', 'puzzle', 'anagram', 'wordle', 'crosswords', 'crossword', 'shorts', 'youtubeshorts'];

        const res = await youtube.videos.insert({
          part: 'snippet,status',
          requestBody: {
            snippet: {
              title,
              description,
              tags,
              categoryId: '20', // Gaming category
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false,
            },
          },
          media: {
            body: fs.createReadStream(finalVideoPath),
          },
        });
        console.log(`✅ Video uploaded to YouTube: ${res.data.id}`);
      } catch (uploadError) {
        console.error('❌ Failed to upload video to YouTube:', uploadError.message);
        if (uploadError.response && uploadError.response.data) {
          console.error('YouTube API Error Details:', uploadError.response.data.error);
        }
      }
    }

    await context.close();

  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

generateVideo()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to generate video:', error);
    process.exit(1);
  });
