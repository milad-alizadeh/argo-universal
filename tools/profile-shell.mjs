import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../e2e/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const label = process.argv[2] ?? 'current';
const throttle = Number(process.argv[3] ?? 1);
const origin = process.argv[4] ?? 'http://localhost:6007';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'no-preference',
});
const session = await page.context().newCDPSession(page);
await session.send('Performance.enable');
await session.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await mkdir('/tmp/argo-shell-profile', { recursive: true });
await page.goto(
  `${origin}/iframe.html?id=shell-desktopshell--selected-section&viewMode=story&args=showInspectorControls:true`,
);
await page.getByRole('button', { name: 'Hide sidebar' }).waitFor();
await page.waitForTimeout(500);
await page.evaluate(() => {
  for (const [id, count] of [
    ['list-content', 150],
    ['detail-content', 300],
  ]) {
    const parent = document.querySelector(
      `[data-testid="${id}"]`,
    ).parentElement;
    for (let row = 0; row < count; row++) {
      const item = document.createElement('div');
      item.textContent = `Profiling row ${row}: representative text content that stays readable while the shell moves.`;
      item.style.cssText = 'padding:8px 16px;font-size:14px;line-height:20px;';
      parent.appendChild(item);
    }
  }
});
for (const name of [
  'Hide sidebar',
  'Show sidebar',
  'Open Inspector',
  'Close Inspector',
]) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(350);
}
await session.send('Tracing.start', {
  categories:
    'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing',
  transferMode: 'ReturnAsStream',
});
const metrics = async () =>
  Object.fromEntries(
    (await session.send('Performance.getMetrics')).metrics.map((x) => [
      x.name,
      x.value,
    ]),
  );
const before = await metrics();
const results = [];
for (const panel of ['sidebar', 'Inspector']) {
  const intervals = [];
  for (let toggle = 0; toggle < 12; toggle++) {
    const sampling = page.evaluate(
      () =>
        new Promise((resolve) => {
          const frames = [];
          let previous;
          const start = performance.now();
          const frame = (now) => {
            if (previous !== undefined) frames.push(now - previous);
            previous = now;
            if (now - start < 500) requestAnimationFrame(frame);
            else resolve(frames);
          };
          requestAnimationFrame(frame);
        }),
    );
    let name = '';
    if (panel === 'sidebar')
      name = toggle % 2 ? 'Show sidebar' : 'Hide sidebar';
    else name = toggle % 2 ? 'Close Inspector' : 'Open Inspector';
    await page.getByRole('button', { name, exact: true }).click();
    intervals.push(...(await sampling));
  }
  intervals.sort((a, b) => a - b);
  const percentile = (p) =>
    intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * p))];
  results.push({
    panel,
    frames: intervals.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    maximum: intervals.at(-1),
    framesOver25ms: intervals.filter((x) => x > 25).length,
  });
}
const after = await metrics();
const complete = new Promise((resolve) =>
  session.once('Tracing.tracingComplete', resolve),
);
await session.send('Tracing.end');
const { stream } = await complete;
let trace = '';
for (;;) {
  const chunk = await session.send('IO.read', { handle: stream });
  trace += chunk.data;
  if (chunk.eof) break;
}
await session.send('IO.close', { handle: stream });
await writeFile(`/tmp/argo-shell-profile/${label}-trace.json`, trace);
const events = JSON.parse(trace).traceEvents;
const eventSummary = {};
for (const name of [
  'Layout',
  'UpdateLayoutTree',
  'Paint',
  'RasterTask',
  'CompositeLayers',
]) {
  const matching = events.filter(
    (event) => event.name === name && event.ph === 'X',
  );
  eventSummary[name] = {
    count: matching.length,
    milliseconds:
      matching.reduce((sum, event) => sum + (event.dur ?? 0), 0) / 1000,
  };
}
const deltas = Object.fromEntries(
  [
    'LayoutCount',
    'RecalcStyleCount',
    'LayoutDuration',
    'RecalcStyleDuration',
    'TaskDuration',
  ].map((key) => [key, after[key] - before[key]]),
);
const report = {
  label,
  throttle,
  origin,
  browserVersion: browser.version(),
  warmupToggles: 4,
  viewport: [1440, 900],
  stressRows: 450,
  toggles: 24,
  frameTimings: results,
  metrics: deltas,
  trace: eventSummary,
};
await writeFile(
  `/tmp/argo-shell-profile/${label}.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
await browser.close();
