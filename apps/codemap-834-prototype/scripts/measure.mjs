import { mkdirSync, writeFileSync } from 'node:fs';
// Manual evidence collector, not a production test seam. Run sequentially; one browser only.
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import os from 'node:os';
async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return String(port);
}
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const e2e = createRequire(`${root}/e2e/package.json`);
const desktop = createRequire(`${root}/apps/desktop/package.json`);
const { chromium, _electron } = e2e('@playwright/test');
const directory = process.env.CODEMAP_EVIDENCE ?? '/tmp/codemap-834-evidence';
mkdirSync(directory, { recursive: true });
const mode = process.argv[2] ?? 'web';
const fullDesktop = mode.startsWith('desktop');
const counts = process.env.CODEMAP_SMOKE ? [0] : [5000, 20000];
const views = ['3d', 'flat'].includes(process.argv[3])
  ? [process.argv[3]]
  : ['3d', 'flat'];
const results = [];
let browser, app;
if (mode === 'web')
  browser = await chromium.launch({ channel: 'chrome', headless: false });
else if (!fullDesktop) {
  const { build } = await import(e2e.resolve('rolldown'));
  await build({
    input: `${root}/apps/codemap-834-prototype/scripts/electron-harness.mts`,
    external: ['electron'],
    platform: 'node',
    output: { file: `${directory}/harness.cjs`, format: 'cjs' },
  });
}
for (const view of views)
  for (const count of counts) {
    const start = performance.now();
    let context, page;
    const query = `?view=${view}&files=${count}`;
    if (browser) {
      context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 1,
      });
      page = await context.newPage();
    } else {
      const env = {
        ...process.env,
        CODEMAP_USER_DATA: `${directory}/profile-${mode}-${view}-${count}`,
        CODEMAP_EXPORT: `${root}/apps/universal-app/dist-codemap-834`,
        CODEMAP_QUERY: query,
        CODEMAP_NO_GPU: mode.endsWith('no-gpu') ? '1' : '0',
        ARGO_HOME: `${directory}/argo-home-${mode}-${view}-${count}`,
        ARGO_USER_DATA_DIRECTORY: `${directory}/argo-profile-${mode}-${view}-${count}`,
        ARGO_BACKGROUND: '0',
        ARGO_SERVER_PORT: await unusedPort(),
      };
      delete env.ELECTRON_RUN_AS_NODE;
      delete env.ARGO_EXPO_WEB_URL;
      app = await _electron.launch({
        executablePath: desktop('electron'),
        args: fullDesktop
          ? [
              ...(mode.endsWith('no-gpu') ? ['--disable-gpu'] : []),
              `${root}/apps/desktop`,
            ]
          : [`${directory}/harness.cjs`],
        env,
      });
      page = await app.firstWindow();
    }
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    if (browser)
      await page.goto(`http://127.0.0.1:8340/codemap-834-prototype${query}`);
    else if (fullDesktop)
      await page.goto(`app://app/codemap-834-prototype${query}`);
    try {
      await page.waitForFunction(
        () => window.__codemap834?.ready,
        {},
        { timeout: 25000 },
      );
      const scenarioReadyMs = performance.now() - start;
      await page.waitForTimeout(1000);
      const evidence = await page.evaluate(() => ({
        ...window.__codemap834,
        pan: undefined,
        viewport: {
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
          visibility: document.visibilityState,
        },
      }));
      const samples = [];
      for (let i = 0; i < (process.env.CODEMAP_SMOKE ? 1 : 3); i++)
        samples.push(await page.evaluate(() => window.__codemap834.pan(6000)));
      await page.getByRole('button', { name: 'Fit', exact: true }).click();
      await page.waitForTimeout(200);
      await page.screenshot({
        path: join(directory, `${mode}-${view}-${count}.png`),
      });
      const canvas = page.locator('canvas').first();
      const bounds = await canvas.boundingBox();
      // Press real pixels in a grid until a visible tile is selected; verifies raycast / flat hit test.
      if (bounds)
        for (let y = 0.35; y <= 0.7; y += 0.1) {
          for (let x = 0.35; x <= 0.7; x += 0.1) {
            await page.mouse.click(
              bounds.x + bounds.width * x,
              bounds.y + bounds.height * y,
            );
            if (
              await page.evaluate(() => Boolean(window.__codemap834.selectedId))
            )
              break;
          }
          if (
            await page.evaluate(() => Boolean(window.__codemap834.selectedId))
          )
            break;
        }
      const selected = await page.evaluate(
        () => window.__codemap834.selectedId ?? null,
      );
      results.push({
        mode,
        view,
        count,
        scenarioReadyMs,
        ...evidence,
        selected,
        samples,
        errors,
      });
    } catch (error) {
      await page.screenshot({
        path: join(directory, `${mode}-${view}-${count}-failure.png`),
      });
      results.push({ mode, view, count, error: error.message, errors });
    }
    if (app) {
      const features = await app.evaluate(({ app }) =>
        app.getGPUFeatureStatus(),
      );
      results.at(-1).gpuFeatures = features;
      await app.close();
      app = null;
    }
    if (context) await context.close();
    writeFileSync(
      join(directory, `${mode}.json`),
      JSON.stringify(
        {
          machine: {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus()[0]?.model,
            memoryGiB: os.totalmem() / 2 ** 30,
          },
          results,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify(results.at(-1)));
  }
await browser?.close();
