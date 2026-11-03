const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + __dirname + '/collage.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.locator('#c').screenshot({ path: __dirname + '/collage-predio-aldea.png' }); await b.close(); })();
