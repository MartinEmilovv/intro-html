// Renders the SVG logos to PNG with the pre-installed Chromium.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  for (const [svg, png, w, h] of [
    ['logo-icon.svg', 'primer-logistics-icon.png', 512, 512],
    ['logo-wordmark.svg', 'primer-logistics-wordmark.png', 760, 320],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const markup = fs.readFileSync(path.join(__dirname, svg), 'utf8');
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, png), omitBackground: true,
      clip: { x: 0, y: 0, width: w, height: h } });
    await page.close();
  }
  await browser.close();
})();
