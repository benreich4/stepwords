#!/usr/bin/env node

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(__dirname, '..', 'youtube-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'youtube-credentials.json');

// YouTube API scopes
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

/**
 * Create an OAuth2 client with the given credentials
 */
function createOAuth2Client(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web || {};
  // Use localhost redirect URI - Google will redirect here and show the code
  // If credentials file has redirect_uris, use the first one, otherwise use localhost
  const redirectUri = redirect_uris && redirect_uris.length > 0 
    ? redirect_uris[0] 
    : 'http://localhost';
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirectUri
  );
  return oAuth2Client;
}

/**
 * Read previously authorized credentials from the save file
 */
function loadSavedCredentials() {
  try {
    const content = fs.readFileSync(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Store credentials to disk for future program executions
 */
function saveCredentials(client) {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  }, null, 2);
  fs.writeFileSync(TOKEN_PATH, payload);
  console.log('Token stored to', TOKEN_PATH);
}

/**
 * Get and store new token after prompting for user authorization
 */
async function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });
  
  console.log('Authorize this app by visiting this url:', authUrl);
  console.log('\nAfter authorizing, Google will redirect you to localhost.');
  console.log('Copy the ENTIRE URL from your browser\'s address bar (it will contain ?code=...)');
  console.log('Or if you see an error page, look for the code parameter in the URL.\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve, reject) => {
    rl.question('Enter the full redirect URL (or just the code): ', (input) => {
      rl.close();
      
      // Extract code from URL if full URL was pasted
      let code = input.trim();
      if (code.includes('code=')) {
        try {
          // Handle both full URLs and just the query string
          const urlString = code.startsWith('http') ? code : `http://localhost?${code}`;
          const url = new URL(urlString);
          code = url.searchParams.get('code') || code;
        } catch (e) {
          // If URL parsing fails, try to extract code manually
          const match = code.match(/[?&]code=([^&]+)/);
          if (match) code = match[1];
        }
      }
      
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('\n❌ Error retrieving access token');
          if (err.message && err.message.includes('access_denied') || err.message.includes('verification')) {
            console.error('\n⚠️  Access Denied / Verification Error');
            console.error('This usually means:');
            console.error('1. Your app needs Google verification (for production apps)');
            console.error('2. OR your app is in "Testing" mode but your email is not added as a test user');
            console.error('3. OR the YouTube Data API v3 is not enabled');
            console.error('\n📋 To fix (EASIEST - Keep app in Testing mode):');
            console.error('1. Go to https://console.cloud.google.com/');
            console.error('2. Select your project');
            console.error('3. Go to "APIs & Services" → "OAuth consent screen"');
            console.error('4. Make sure "Publishing status" shows "Testing" (NOT "In production")');
            console.error('5. Scroll down to "Test users" section');
            console.error('6. Click "ADD USERS" and add your Google account email');
            console.error('7. Click "Save"');
            console.error('8. Ensure "YouTube Data API v3" is enabled in "APIs & Services" → "Library"');
            console.error('\n💡 Note: For personal use, keep the app in Testing mode.');
            console.error('   This avoids the Google verification process.');
          } else {
            console.error('Error details:', err.message);
          }
          reject(err);
          return;
        }
        oAuth2Client.setCredentials(token);
        saveCredentials(oAuth2Client);
        resolve(oAuth2Client);
      });
    });
  });
}

/**
 * Load or request authorization to call APIs
 */
async function authorize() {
  let client = loadSavedCredentials();
  if (client) {
    return client;
  }
  
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ Credentials file not found!');
    console.log('\n📋 Setup Instructions:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project (or select an existing one)');
    console.log('3. Enable the YouTube Data API v3');
    console.log('4. Go to "APIs & Services" → "OAuth consent screen"');
    console.log('   - Choose "External" user type');
    console.log('   - Fill in App name, User support email, Developer contact email');
    console.log('   - Add your email as a test user (if in testing mode)');
    console.log('   - Add scope: https://www.googleapis.com/auth/youtube.upload');
    console.log('5. Go to "Credentials" → "Create Credentials" → "OAuth client ID"');
    console.log('6. Choose "Web application"');
    console.log('7. Under "Authorized redirect URIs", add: http://localhost');
    console.log('8. Download the credentials JSON file');
    console.log(`9. Save it as: ${CREDENTIALS_PATH}`);
    console.log('\nFor more details, see: https://developers.google.com/youtube/v3/guides/auth');
    process.exit(1);
  }
  
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const oAuth2Client = createOAuth2Client(credentials);
  
  return await getAccessToken(oAuth2Client);
}

/**
 * Authenticate and return YouTube client
 */
export async function authenticateYouTube() {
  try {
    const auth = await authorize();
    
    // Refresh token if needed
    if (auth.credentials.expiry_date && auth.credentials.expiry_date <= Date.now()) {
      await auth.refreshAccessToken();
      saveCredentials(auth);
    }
    
    return auth;
  } catch (error) {
    console.error('Error during authentication:', error);
    throw error;
  }
}

// If run directly, test authentication
if (import.meta.url === `file://${process.argv[1]}`) {
  authenticateYouTube()
    .then(() => {
      console.log('✅ Authentication successful!');
      console.log('You can now use --upload flag with generate-video script.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Authentication failed:', error.message);
      process.exit(1);
    });
}
