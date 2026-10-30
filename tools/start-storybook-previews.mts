import { spawn, type ChildProcess } from 'node:child_process';
import { connect } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { resolveExecutable } from '@repo/executables';
import {
  findIosDevice,
  openIosStorybook,
  openNamedAndroidStorybook,
} from './storybook-devices.mts';
import { forwardOutput } from './storybook-output.mts';
import { storybookSyncPort } from './storybook-sync-port.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const webUrl = 'http://127.0.0.1:6006/';

const syncPort = storybookSyncPort();

const children: ChildProcess[] = [];

const linkedDevices = new Set<string>();

let stopping = false;

function stop(exitCode: number): void {
  if (stopping) return;

  stopping = true;
  process.exitCode = exitCode;

  for (const child of children) child.kill('SIGINT');
}

process.once('SIGINT', () => stop(130));

process.once('SIGTERM', () => stop(143));

function start(
  name: string,
  args: string[],
  onOutput?: (output: string) => void,
): ChildProcess {
  const child = spawn(resolveExecutable(name), args, {
    cwd: repoRoot,
    stdio: onOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });

  if (onOutput) forwardOutput(child, onOutput);

  watchChild(child);

  return child;
}

function watchChild(child: ChildProcess): void {
  children.push(child);
  child.once('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.once('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}

// A link sent while the dev client is still on its launcher or loading the bundle is dropped.
let androidBundled = false;

function androidReadyToLink(): boolean {
  return androidBundled || stopping;
}

async function linkToStorybook(deviceName: string): Promise<void> {
  await delay(3000);

  if (stopping) return;

  const iosDevice = await findIosDevice(deviceName);

  await (iosDevice
    ? openIosStorybook(iosDevice)
    : openNamedAndroidStorybook(deviceName, androidReadyToLink));

  console.log(`Opened /storybook on ${deviceName}`);
}

function queueLink(deviceName: string): void {
  if (linkedDevices.has(deviceName)) return;

  linkedDevices.add(deviceName);
  void linkToStorybook(deviceName).catch((error: Error) => {
    console.error(`Could not open /storybook on ${deviceName}:`, error);
  });
}

function openedDeviceName(output: string): string | null {
  const start = output.indexOf('Opening exp+argo://');

  if (start < 0) return null;

  const nameStart = output.lastIndexOf(' on ');

  return nameStart > start ? output.slice(nameStart + 4).trim() : null;
}

function onExpoOutput(output: string): void {
  if (output.includes('Android Bundled')) androidBundled = true;

  const deviceName = openedDeviceName(output);

  if (deviceName) queueLink(deviceName);
}

async function websocketReady(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(syncPort, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function webReady(): Promise<boolean> {
  try {
    const response = await fetch(webUrl, { signal: AbortSignal.timeout(1000) });

    return response.ok && (await websocketReady());
  } catch {
    return false;
  }
}

start('pnpm', [
  '--filter',
  '@repo/storybook',
  'exec',
  'storybook',
  'dev',
  '-p',
  '6006',
  '--no-open',
]);

const browserNotOpened = (error: Error): void =>
  console.error(`Could not open the browser: ${error.message}`);

// A Mac without `open` in PATH still starts the previews, as one whose `open` fails does.
function openBrowser(): void {
  try {
    spawn(resolveExecutable('open'), [webUrl], {
      cwd: repoRoot,
      stdio: 'ignore',
    }).once('error', browserNotOpened);
  } catch (error) {
    browserNotOpened(error instanceof Error ? error : new Error(String(error)));
  }
}

let ready = false;

for (let attempt = 0; attempt < 120 && !stopping; attempt += 1) {
  if (await webReady()) {
    ready = true;
    break;
  }

  await delay(500);
}

if (!stopping && !ready) {
  console.error(`Web Storybook did not start on ports 6006 and ${syncPort}.`);
  stop(1);
}

if (!stopping) {
  openBrowser();
  start(
    'pnpm',
    [
      '--filter',
      '@repo/universal-app',
      'exec',
      'expo',
      'start',
      '--ios',
      '--android',
    ],
    onExpoOutput,
  );
}
