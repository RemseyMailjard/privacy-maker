import { chromium } from 'playwright';
import path from 'node:path';

const SCRATCH = 'C:/Users/PC/AppData/Local/Temp/claude/c--Users-PC-Desktop-Portfolio-Privacy-Maker/353fc807-ff53-4141-b3cb-659544452646/scratchpad';
const testPdfPath = path.join(SCRATCH, 'test.pdf');
const downloadPath = path.join(SCRATCH, 'redacted.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[browser console error]', msg.text());
});
page.on('pageerror', (err) => console.log('[browser page error]', err.message));

console.log('1. Navigating...');
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

console.log('2. Scrolling to tool and accepting model download...');
await page.getByRole('link', { name: /probeer|try/i }).first().click().catch(() => {});
await page.waitForTimeout(500);

// Accept the one-time model download consent
const downloadBtn = page.getByRole('button', { name: /download model|model downloaden/i });
await downloadBtn.waitFor({ state: 'visible', timeout: 15000 });
await downloadBtn.click();
console.log('3. Waiting for model to finish loading (progress bar)...');
// Model finishes loading when the "Ready" status appears
await page.waitForFunction(
  () => document.body.innerText.includes('Ready') || document.body.innerText.includes('Klaar'),
  { timeout: 180000 },
);
console.log('   Model loaded.');

console.log('4. Uploading test PDF...');
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles(testPdfPath);

// Wait for the PDF text to appear in the input panel (extraction succeeded)
await page.waitForFunction(
  () => document.body.innerText.includes('Jan Jansen'),
  { timeout: 30000 },
);
console.log('   PDF text extracted and shown in the input panel.');

console.log('5. Clicking Redact Document...');
const redactBtn = page.getByRole('button', { name: /redact document|document anonimiseren/i });
await redactBtn.click();

console.log('6. Waiting for detection to finish...');
await page.waitForFunction(
  () => {
    const text = document.body.innerText;
    return /Found \d+ Sensitive|gevonden/i.test(text) && !text.includes('Redacting') && !text.includes('anonimiseren...');
  },
  { timeout: 60000 },
);
await page.waitForTimeout(1000);

console.log('7. Downloading redacted PDF...');
const downloadPdfBtn = page.getByRole('button', { name: /download redacted pdf|geanonimiseerde pdf/i });
await downloadPdfBtn.waitFor({ state: 'visible', timeout: 10000 });
const [download] = await Promise.all([
  page.waitForEvent('download'),
  downloadPdfBtn.click(),
]);
await download.saveAs(downloadPath);
console.log('   Saved redacted PDF to', downloadPath);

await browser.close();
console.log('DONE');
