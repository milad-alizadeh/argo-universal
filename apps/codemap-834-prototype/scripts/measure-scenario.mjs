import { join } from 'node:path';
import { errors, pick, samples, snapshot } from './measure-actions.mjs';
import { close, navigate, open } from './measure-launch.mjs';
import { timing } from './measure-options.mjs';

function filename(ctx, failure = false) {
  const { settings, scenario } = ctx;

  return join(
    settings.directory,
    `${settings.mode}-${scenario.view}-${scenario.count}${failure ? '-failure' : ''}.png`,
  );
}

function identity({ settings, scenario }) {
  return { mode: settings.mode, view: scenario.view, count: scenario.count };
}

async function waitReady(page, start) {
  await page.waitForFunction(
    () => window.__codemap834?.ready,
    {},
    { timeout: timing.ready },
  );

  return performance.now() - start;
}

async function readings({ session, settings, start }) {
  const page = session.page;
  const scenarioReadyMs = await waitReady(page, start);
  await page.waitForTimeout(timing.settle);
  const evidence = await snapshot(page);

  return {
    scenarioReadyMs,
    ...evidence,
    samples: await samples(page, settings.samples),
  };
}

async function fitScreenshot(ctx) {
  const page = ctx.session.page;
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.waitForTimeout(timing.fit);
  await page.screenshot({ path: filename(ctx) });
}

async function measure(ctx) {
  const evidence = await readings(ctx);
  await fitScreenshot(ctx);

  return {
    ...identity(ctx),
    ...evidence,
    desktopBackgroundThrottling: ctx.settings.fullDesktop ? false : undefined,
    selected: await pick(ctx.session.page),
  };
}

async function failure(ctx, error) {
  await ctx.session.page.screenshot({ path: filename(ctx, true) });

  return { ...identity(ctx), error: error.message };
}

async function capture(ctx) {
  const messages = errors(ctx.session.page);

  try {
    await navigate(ctx.session, ctx.settings, ctx.scenario);

    return { ...(await measure(ctx)), errors: messages };
  } catch (error) {
    return { ...(await failure(ctx, error)), errors: messages };
  }
}

export async function run(settings, scenario, web) {
  const start = performance.now();
  const session = await open(settings, scenario, web);

  try {
    const result = await capture({ session, settings, scenario, start });

    if (session.app)
      result.gpuFeatures = await session.app.evaluate(({ app }) =>
        app.getGPUFeatureStatus(),
      );

    return result;
  } finally {
    await close(session);
  }
}
