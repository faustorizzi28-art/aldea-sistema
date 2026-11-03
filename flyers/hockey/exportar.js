const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + __dirname + '/flyer.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.locator('#f').screenshot({ path: __dirname + '/flyer-mundialito-hockey-aldea.png' }); await b.close(); })();
