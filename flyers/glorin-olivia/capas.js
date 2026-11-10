const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + __dirname + '/capas.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  for (const id of ['s1','s2','s3','e1','e2','e3','e4','e5','e0','fin']) await p.locator('#' + id).screenshot({ path: `${__dirname}/${id}.png`, omitBackground: true });
  await b.close(); })();
