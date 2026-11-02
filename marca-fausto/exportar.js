const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1700, height: 1200 } });
  await p.goto('file://' + __dirname + '/logos.html'); await p.evaluate(() => document.fonts.ready);
  for (const id of ['A', 'AD', 'B', 'C', 'P']) await p.locator('#' + id).screenshot({ path: `${__dirname}/logo-${id}.png`, omitBackground: true });
  await b.close();
})();
