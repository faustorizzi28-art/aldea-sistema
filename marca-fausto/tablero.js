const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto('file://' + __dirname + '/tablero.html'); await p.evaluate(() => document.fonts.ready);
  await p.locator('#t').screenshot({ path: __dirname + '/tablero-logos-fausto.png' }); await b.close(); })();
