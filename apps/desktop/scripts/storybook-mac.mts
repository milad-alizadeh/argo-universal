import { type ChildProcess, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { build, type InlineConfig } from 'vite';
import { z } from 'zod';

/*
 * `pnpm storybook:mac [port]`: opens Storybook in an Electron window with the desktop app's preload, so every icon
 * draws as the SF Symbol the macOS app draws. It attaches to a Storybook already on the port, or starts one there.
 * Local development only: the window and its build stay in node_modules/.cache, and Forge never packages them.
 */
const defaultPort = 6006;

const startTimeoutMs = 120_000;

const requestTimeoutMs = 2000;

const retryDelayMs = 500;

const desktopDirectory = join(import.meta.dirname, '..');

const storybookDirectory = join(desktopDirectory, '../storybook');

const outDirectory = join(
  desktopDirectory,
  'node_modules/.cache/storybook-mac',
);

const largestPort = 65_535;

const Port = z.coerce.number().int().min(1).max(largestPort);

if (process.platform !== 'darwin') {
  console.error('storybook:mac needs macOS, the only platform with SF Symbols');
  process.exit(1);
}

const port = Port.parse(process.argv[2] ?? defaultPort);

const storybookUrl = `http://localhost:${port}`;

const answers = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${storybookUrl}/iframe.html`, {
      signal: AbortSignal.timeout(requestTimeoutMs),
    });

    return response.ok;
  } catch {
    return false;
  }
};

const startStorybook = (): ChildProcess =>
  spawn(
    join(storybookDirectory, 'node_modules/.bin/storybook'),
    ['dev', '--port', String(port), '--no-open', '--ci'],
    // Its own process group, so stopping it also stops the processes Storybook starts.
    { cwd: storybookDirectory, stdio: 'inherit', detached: true },
  );

const stop = (storybook: ChildProcess | undefined): void => {
  if (storybook?.pid) process.kill(-storybook.pid, 'SIGTERM');
};

const pollStorybook = async (): Promise<void> => {
  const deadline = Date.now() + startTimeoutMs;

  while (!(await answers())) {
    if (Date.now() > deadline) {
      throw new Error(`Storybook did not answer on ${storybookUrl}`);
    }

    await delay(retryDelayMs);
  }
};

// A Storybook that exits before it answers (port taken, build error) fails the wait at once; a later exit is not an error here.
const exitBeforeAnswer = (storybook: ChildProcess): Promise<never> => {
  const exited = new Promise<never>((_, reject): void => {
    storybook.once('exit', (code, signal): void => {
      reject(
        new Error(`Storybook exited (${signal ?? code}) before it answered`),
      );
    });
  });

  exited.catch((): void => undefined);

  return exited;
};

const waitForStorybook = (
  storybook: ChildProcess | undefined,
): Promise<void> =>
  storybook
    ? Promise.race([pollStorybook(), exitBeforeAnswer(storybook)])
    : pollStorybook();

// The Storybook window's main process, and the desktop app's own preload, unchanged.
const windowBuild = {
  configFile: false,
  logLevel: 'warn',
  root: desktopDirectory,
  build: {
    outDir: outDirectory,
    emptyOutDir: true,
    minify: false,
    ssr: true,
    target: 'node22',
    rollupOptions: {
      input: {
        main: join(desktopDirectory, 'src/storybook/storybook-window.ts'),
        preload: join(desktopDirectory, 'src/preload/preload.ts'),
      },
      external: ['electron'],
      output: { format: 'cjs', entryFileNames: '[name].cjs' },
    },
  },
  ssr: { noExternal: true },
} satisfies InlineConfig;

const buildWindow = async (): Promise<void> => {
  await build(windowBuild);
};

const storybook = (await answers()) ? undefined : startStorybook();

try {
  await waitForStorybook(storybook);
  await buildWindow();
} catch (error) {
  stop(storybook);
  throw error;
}

const electron = z.string().parse(createRequire(import.meta.url)('electron'));

// Spawn skips an undefined variable, so Electron runs as Electron even under a Node-mode parent.
const storybookWindow = spawn(electron, [join(outDirectory, 'main.cjs')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ARGO_STORYBOOK_URL: storybookUrl,
    ELECTRON_RUN_AS_NODE: undefined,
  },
});

storybookWindow.on('exit', (code): void => {
  stop(storybook);
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, (): void => {
    storybookWindow.kill();
    stop(storybook);
    process.exit(1);
  });
}
