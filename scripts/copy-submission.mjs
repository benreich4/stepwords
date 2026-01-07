#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const [url, type] = process.argv.slice(2);

if (!url || !type) {
  console.error('Usage: node copy-submission.mjs <url> <type>');
  console.error('  url: Submission URL (e.g., https://stepwords.xyz/submissions/submission-2025-12-10-16-59-03)');
  console.error('  type: Puzzle type (main, quick, or other)');
  process.exit(1);
}

// Validate type
const validTypes = ['main', 'quick', 'other'];
if (!validTypes.includes(type)) {
  console.error(`Error: type must be one of: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Determine directory based on type
const dirMap = {
  main: 'puzzles',
  quick: 'quick',
  other: 'other'
};
const puzzleDir = path.join(__dirname, '..', 'public', dirMap[type]);
const indexFile = path.join(puzzleDir, 'index.json');

// Find next available ID
function getNextId(puzzleDir) {
  if (!fs.existsSync(puzzleDir)) {
    return '1';
  }
  const files = fs.readdirSync(puzzleDir)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .map(f => {
      const id = f.replace('.json', '');
      const num = parseInt(id, 10);
      return isNaN(num) ? 0 : num;
    });
  
  if (files.length === 0) {
    return '1';
  }
  
  const maxId = Math.max(...files);
  return String(maxId + 1);
}

// Find next available date
function getNextDate(indexFile) {
  if (!fs.existsSync(indexFile)) {
    // If no index exists, use today's date
    return new Date().toISOString().split('T')[0];
  }
  
  const indexContent = fs.readFileSync(indexFile, 'utf8');
  const index = JSON.parse(indexContent);
  
  if (index.length === 0) {
    return new Date().toISOString().split('T')[0];
  }
  
  // Find the latest date (sort descending, take first)
  const dates = index.map(entry => entry.date).filter(Boolean);
  if (dates.length === 0) {
    return new Date().toISOString().split('T')[0];
  }
  
  const latestDate = dates.sort((a, b) => b.localeCompare(a))[0];
  const dateObj = new Date(latestDate);
  dateObj.setDate(dateObj.getDate() + 1);
  return dateObj.toISOString().split('T')[0];
}

// Get next ID and date
const newId = getNextId(puzzleDir);
const date = getNextDate(indexFile);
const puzzleFile = path.join(puzzleDir, `${newId}.json`);

console.log(`Next available ID: ${newId}`);
console.log(`Next available date: ${date}`);

// Extract submission ID from URL
let submissionId = url.split('/').pop();
// Remove .json if present
if (submissionId.endsWith('.json')) {
  submissionId = submissionId.slice(0, -5);
}
if (!submissionId.startsWith('submission-')) {
  console.error('Error: Invalid submission URL format. Expected URL ending with submission-YYYY-MM-DD-HH-MM-SS');
  process.exit(1);
}

// Construct API endpoint URL
const urlObj = new URL(url);
const apiUrl = `${urlObj.origin}/api/get-submission.php?id=${encodeURIComponent(submissionId)}`;

// Fetch submission JSON
console.log(`Fetching submission from ${apiUrl}...`);
try {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const submission = await response.json();
  
  if (!submission.rows || !Array.isArray(submission.rows)) {
    throw new Error('Invalid submission format: missing rows array');
  }
  
  if (!submission.author) {
    throw new Error('Invalid submission format: missing author');
  }
  
  // Transform submission to puzzle format
  const puzzle = {
    id: newId,
    rows: submission.rows.map(row => {
      const { answer, clue, breakdown } = row;
      const result = { answer, clue };
      
      // Remove breakdown field if it exists separately
      // Breakdown should already be in clue parentheses, but handle both cases
      if (breakdown && typeof clue === 'string') {
        const breakdownTight = String(breakdown).replace(/\s+/g, '');
        const hasParens = /\([0-9,\s]+\)\s*$/.test(clue);
        if (!hasParens) {
          result.clue = `${clue.trim()} (${breakdownTight})`;
        }
      }
      
      return result;
    })
  };
  
  // Add emoji if present
  if (submission.emoji) {
    puzzle.emoji = submission.emoji;
  }
  
  // Read existing index
  let index = [];
  if (fs.existsSync(indexFile)) {
    const indexContent = fs.readFileSync(indexFile, 'utf8');
    index = JSON.parse(indexContent);
  }
  
  // Add new entry to index (append at the end, sorted by date ascending)
  const newEntry = {
    id: newId,
    author: submission.author,
    date: date
  };
  
  // Append at the end and sort by date ascending
  index.push(newEntry);
  index.sort((a, b) => {
    // Sort by date ascending, then by id ascending as tiebreaker
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return parseInt(a.id) - parseInt(b.id);
  });
  
  // Write puzzle file
  console.log(`Writing puzzle to ${puzzleFile}...`);
  fs.writeFileSync(puzzleFile, JSON.stringify(puzzle, null, 2) + '\n');
  
  // Write updated index
  console.log(`Updating index at ${indexFile}...`);
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
  
  console.log(`✓ Successfully copied submission as puzzle ${newId} (${type})`);
  console.log(`  Author: ${submission.author}`);
  console.log(`  Date: ${date}`);
  console.log(`  Rows: ${puzzle.rows.length}`);
  
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
