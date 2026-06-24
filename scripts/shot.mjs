import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:5174';
const path = process.argv[2] || '/';
const name = process.argv[3] || 'shot';
const width = parseInt(process.argv[4] || '420', 10);
const height = parseInt(process.argv[5] || '900', 10);

const light = process.env.LIGHT === '1';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(base + '/?noanalytics=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.evaluate((isLight) => {
  try {
    localStorage.setItem('stepwords-first-visit', '1');
    localStorage.setItem('stepwords-how-to-play', 'true');
    localStorage.setItem('quickstep-intro-shown', '1');
    localStorage.setItem('stepwords-clue-coach-shown', '1');
    localStorage.setItem('stepwords-kb-collapse-coach', '1');
    localStorage.setItem('stepwords-submission-prompt-shown', '1');
    localStorage.setItem('stepwords-share-nudge', '1');
    localStorage.setItem('stepwords-settings', JSON.stringify({ lightMode: isLight }));
  } catch {}
}, light);
await page.goto(base + path + (path.includes('?') ? '&' : '?') + 'noanalytics=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1500);
if (process.env.TYPE) {
  for (const ch of process.env.TYPE.split('')) {
    await page.keyboard.press(ch.toUpperCase());
    await page.waitForTimeout(120);
  }
  if (process.env.ENTER === '1') { await page.keyboard.press('Enter'); await page.waitForTimeout(800); }
}
if (process.env.CLICK) {
  try { await page.click(process.env.CLICK, { timeout: 4000 }); await page.waitForTimeout(700); } catch {}
}
await page.screenshot({ path: `scripts/${name}.png`, fullPage: process.env.FULL === '1' });
await browser.close();
console.log('saved scripts/' + name + '.png');
