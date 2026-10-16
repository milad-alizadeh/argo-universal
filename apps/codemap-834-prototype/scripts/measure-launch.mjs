import { createServer } from 'node:net';
import { _electron, chromium } from '@playwright/test';
import electron from 'electron';
import { build } from 'rolldown';
import { root, exported } from './paths.mjs';

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  if (typeof address !== 'object' || !address)
    throw new Error('No Server port was allocated');
  await new Promise((resolve) => server.close(resolve));

  return String(address.port);
}

export async function browser(settings) {
  if (settings.mode === 'web')
    return chromium.launch({ channel: 'chrome', headless: false });

  if (!settings.fullDesktop)
    await build({
      input: `${root}/apps/codemap-834-prototype/scripts/electron-harness.mts`,
      external: ['electron'],
      platform: 'node',
      output: { file: `${settings.directory}/harness.cjs`, format: 'cjs' },
    });
}

function harnessEnvironment(settings, scenario) {
  return {
    CODEMAP_QUERY: scenario.query,
    CODEMAP_NO_GPU: settings.mode.endsWith('no-gpu') ? '1' : '0',
  };
}

function isolatedEnvironment(env) {
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.ARGO_EXPO_WEB_URL;

  return env;
}

async function environment(settings, scenario) {
  const suffix = `${settings.mode}-${scenario.view}-${scenario.count}`;

  const env = {
    ...process.env,
    CODEMAP_USER_DATA: `${settings.directory}/profile-${suffix}`,
    CODEMAP_EXPORT: exported,
    ...harnessEnvironment(settings, scenario),
    ARGO_HOME: `${settings.directory}/argo-home-${suffix}`,
    ARGO_USER_DATA_DIRECTORY: `${settings.directory}/argo-profile-${suffix}`,
    ARGO_BACKGROUND: '1',
    ARGO_SERVER_PORT: await unusedPort(),
  };

  return isolatedEnvironment(env);
}

function argumentsFor(settings) {
  if (!settings.fullDesktop) return [`${settings.directory}/harness.cjs`];
  const flags = settings.mode.endsWith('no-gpu') ? ['--disable-gpu'] : [];

  return [...flags, `${root}/apps/desktop`];
}

async function show(app) {
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];

    if (!window) throw new Error('Desktop did not create a window');
    window.show();
    window.focus();
  });
}

async function desktop(settings, scenario) {
  const app = await _electron.launch({
    executablePath: electron,
    args: argumentsFor(settings),
    env: await environment(settings, scenario),
  });

  try {
    const page = await app.firstWindow();
    await show(app);

    return { app, page };
  } catch (error) {
    await app.close();
    throw error;
  }
}

export async function open(settings, scenario, web) {
  if (!web) return desktop(settings, scenario);

  const context = await web.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  return { context, page };
}

export async function navigate(session, settings, scenario) {
  if (session.context)
    await session.page.goto(
      `http://127.0.0.1:8340/codemap-834-prototype${scenario.query}`,
    );
  else if (settings.fullDesktop)
    await session.page.goto(`app://app/codemap-834-prototype${scenario.query}`);
  await session.page.bringToFront();
}

export async function close(session) {
  if (session.app) await session.app.close();

  if (session.context) await session.context.close();
}
