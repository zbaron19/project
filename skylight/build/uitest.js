const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, timezoneId: 'America/Los_Angeles' });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  // freeze time to a summer evening in Seattle for reproducible screenshots
  await page.addInitScript(() => {
    const fixed = new Date('2026-07-07T22:45:00-07:00').getTime();
    const RealDate = Date;
    // eslint-disable-next-line no-global-assign
    Date = class extends RealDate {
      constructor(...a) { if (a.length === 0) { super(fixed); } else { super(...a); } }
      static now() { return fixed; }
    };
  });

  await page.goto('file:///home/user/project/skylight/index.html');
  await page.waitForTimeout(1200);

  const briefing = await page.textContent('#briefing');
  const ptable = await page.textContent('#ptable');
  const moon = await page.textContent('#moonfacts');
  const sun = await page.textContent('#sunstats');
  const meteors = await page.textContent('#meteors');
  console.log('--- BRIEFING ---\n' + briefing.trim());
  console.log('--- SUN ---\n' + sun.trim());
  console.log('--- MOON ---\n' + moon.trim());
  console.log('--- PLANETS ---\n' + ptable.trim());
  console.log('--- METEORS ---\n' + meteors.trim());

  await page.screenshot({ path: 'shot-full.png', fullPage: true });

  // tap near center-ish to try selecting something; then screenshot dome
  const dome = await page.locator('#dome').boundingBox();
  // scrub to deep night (+2h)
  await page.fill('#timeslider', '135');
  await page.dispatchEvent('#timeslider', 'input');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shot-night.png', clip: { x: 0, y: 0, width: 430, height: 560 } });

  // red mode
  await page.click('#redbtn');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shot-red.png', clip: { x: 0, y: 0, width: 430, height: 560 } });
  await page.click('#redbtn');

  // location panel
  await page.click('#locbtn');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'shot-loc.png', clip: { x: 0, y: 0, width: 430, height: 620 } });
  await page.click('#locbtn');

  // day time scrub (should wash out stars)
  await page.fill('#timeslider', '720');
  await page.dispatchEvent('#timeslider', 'input');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shot-day.png', clip: { x: 0, y: 0, width: 430, height: 560 } });

  console.log(errors.length ? '\nERRORS:\n' + errors.join('\n') : '\nNO PAGE ERRORS');
  await browser.close();
})();

// tap test: click Saturn via exposed hits
(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, timezoneId: 'America/Los_Angeles' });
  await page.addInitScript(() => {
    const fixed = new Date('2026-07-08T01:30:00-07:00').getTime();
    const RealDate = Date;
    Date = class extends RealDate {
      constructor(...a) { if (a.length === 0) { super(fixed); } else { super(...a); } }
      static now() { return fixed; }
    };
  });
  await page.goto('file:///home/user/project/skylight/index.html');
  await page.waitForTimeout(900);
  const pos = await page.evaluate(() => {
    const h = window.__skyHits.find((x) => x.kind === 'planet' && x.name === 'saturn');
    const dome = document.querySelector('#dome');
    const r = dome.getBoundingClientRect();
    return { x: r.left + h.x * r.width / dome.width, y: r.top + h.y * r.height / dome.height };
  });
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(300);
  console.log('--- SATURN CARD ---\n' + (await page.textContent('#objcard')).trim());
  const vega = await page.evaluate(() => {
    const h = window.__skyHits.find((x) => x.kind === 'star' && window.SKYDATA === undefined ? false : SKYDATA.starNames[x.idx] === 'Vega');
    if (!h) return null;
    const dome = document.querySelector('#dome');
    const r = dome.getBoundingClientRect();
    return { x: r.left + h.x * r.width / dome.width, y: r.top + h.y * r.height / dome.height };
  });
  if (vega) {
    await page.mouse.click(vega.x, vega.y);
    await page.waitForTimeout(300);
    console.log('--- VEGA CARD ---\n' + (await page.textContent('#objcard')).trim());
  }
  await page.screenshot({ path: 'shot-tap.png', clip: { x: 0, y: 0, width: 430, height: 560 } });
  await browser.close();
})();
