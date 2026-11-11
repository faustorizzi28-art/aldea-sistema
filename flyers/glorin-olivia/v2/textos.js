const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + __dirname + '/textos.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const ids = await p.$$eval('.c', e => e.map(x => x.id));
  for (const id of ids) await p.locator('#' + id).screenshot({ path: `${__dirname}/${id}.png`, omitBackground: id !== 'cierre' });
  await b.close(); })();
