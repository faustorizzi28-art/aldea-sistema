const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + __dirname + '/capas.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  for (const id of await p.$$eval('.c', e => e.map(x => x.id))) await p.locator('#' + id).screenshot({ path: `${__dirname}/${id}.png`, omitBackground: id !== 'fin' });
  await b.close(); })();
