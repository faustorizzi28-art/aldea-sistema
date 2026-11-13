const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + __dirname + '/placa-milagros.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.pdf({ path: __dirname + '/placa-rodriguez-gomez-maria-milagros.pdf', preferCSSPageSize: true, printBackground: true });
  await b.close(); })();
