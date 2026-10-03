import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import path from 'node:path';
import { test as base, _electron as electron } from '@playwright/test';
import { z } from 'zod';

export type AppOptions = { appTarget: 'web' | 'electron' };

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const desktopDirectory = path.join(repositoryRoot, 'apps/desktop');
// Resolve Electron from the desktop app, so the launch does not depend on pnpm hoisting.
const electronPath = createRequire(path.join(desktopDirectory, 'package.json'))(
  'electron',
) as string;

const ServerPackage = z.object({ version: z.string() });
const ServerProcess = z.object({ pid: z.int() });

// The version the Server reports in system.info.
export const serverVersion = ServerPackage.parse(
  JSON.parse(
    readFileSync(path.join(repositoryRoot, 'apps/server/package.json'), 'utf8'),
  ),
).version;

const findFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() =>
        typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('No free port')),
      );
    });
  });

// The supervisor removes server.json when it stops, so a file left behind names a Server still running.
const readServerPid = async (home: string) => {
  const text = await readFile(path.join(home, 'server.json'), 'utf8').catch(
    () => null,
  );
  return text === null ? null : ServerProcess.parse(JSON.parse(text)).pid;
};

export const test = base.extend<AppOptions>({
  appTarget: ['web', { option: true }],
  page: async ({ appTarget, page }, use, testInfo) => {
    if (appTarget === 'web') {
      await page.goto('/');
      await use(page);
      return;
    }

    // Desktop starts its own Server in a fresh home on a free port, so it never meets the web project's Server.
    const home = testInfo.outputPath('argo-home');
    const {
      ARGO_EXPO_WEB_URL: _webDevelopmentUrl,
      ELECTRON_RUN_AS_NODE: _runAsNode,
      ...environment
    } = process.env;
    const electronApp = await electron.launch({
      executablePath: electronPath,
      args: [desktopDirectory],
      // `env` replaces the whole environment; without ARGO_EXPO_WEB_URL the window loads the web export over app://.
      env: {
        ...environment,
        ARGO_HOME: home,
        ARGO_SERVER_PORT: String(await findFreePort()),
      },
    });
    try {
      await use(await electronApp.firstWindow());
    } finally {
      // Quitting stops the Server that desktop started (spec section 9).
      await electronApp.close();
    }
    const leftoverPid = await readServerPid(home);
    if (leftoverPid !== null) {
      process.kill(leftoverPid, 'SIGTERM');
      throw new Error(
        `Desktop quit but left its Server (pid ${leftoverPid}) running`,
      );
    }
  },
});

export { expect } from '@playwright/test';
