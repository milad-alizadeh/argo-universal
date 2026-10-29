import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { connect } from 'node:net';
import type { Readable, Writable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { storybookSyncPort } from './storybook-sync-port.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const webUrl = 'http://127.0.0.1:6006/';

const syncPort = storybookSyncPort();

const children: ChildProcess[] = [];

const run = promisify(execFile);

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
  const child = spawn(name, args, {
    cwd: repoRoot,
    stdio: onOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });

  if (onOutput) forwardOutput(child, onOutput);

  children.push(child);
  child.once('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.once('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });

  return child;
}

function pipeOutput(
  stream: Readable | null,
  destination: Writable,
  onOutput: (output: string) => void,
): void {
  if (!stream) return;

  let pending = '';

  stream.setEncoding('utf8');
  stream.on('data', (output: string) => {
    destination.write(output);
    pending += output;

    const lines = pending.split(/[\r\n]+/);

    pending = lines.pop() ?? '';

    for (const line of lines) onOutput(line);
  });
}

function forwardOutput(
  child: ChildProcess,
  onOutput: (output: string) => void,
): void {
  pipeOutput(child.stdout, process.stdout, onOutput);
  pipeOutput(child.stderr, process.stderr, onOutput);
}

function simulatorId(line: string): string | null {
  return line.match(/\(([A-F0-9-]{36})\)/)?.[1] ?? null;
}

async function findIosDevice(deviceName: string): Promise<string | null> {
  const { stdout } = await run('xcrun', [
    'simctl',
    'list',
    'devices',
    'booted',
  ]);

  const line = stdout
    .split('\n')
    .find((entry) => entry.trim().startsWith(`${deviceName} (`));

  if (!line) return null;

  return simulatorId(line);
}

async function findAndroidDevice(deviceName: string): Promise<string | null> {
  const { stdout } = await run('adb', ['devices']);

  const serials = stdout.match(/^emulator-\d+(?=\s+device)/gm) ?? [];

  const matches = await Promise.all(
    serials.map(async (serial) => {
      const { stdout: avdName } = await run('adb', [
        '-s',
        serial,
        'emu',
        'avd',
        'name',
      ]);

      return avdName.trim().split(/\r?\n/)[0] === deviceName ? serial : null;
    }),
  );

  return matches.find((serial) => serial !== null) ?? null;
}

async function openIosStorybook(udid: string): Promise<void> {
  await run('xcrun', ['simctl', 'openurl', udid, 'argo://storybook']);
}

async function openAndroidStorybook(serial: string): Promise<void> {
  await run('adb', [
    '-s',
    serial,
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    'argo://storybook',
    'dev.argo.app',
  ]);
}

async function androidAppRunning(serial: string): Promise<boolean> {
  try {
    const { stdout } = await run('adb', [
      '-s',
      serial,
      'shell',
      'pidof',
      'dev.argo.app',
    ]);

    return Boolean(stdout.trim());
  } catch {
    return false;
  }
}

async function androidSerial(deviceName: string): Promise<string> {
  const serial = await findAndroidDevice(deviceName);

  if (!serial)
    throw new Error(`Could not find Expo's opened device: ${deviceName}`);

  return serial;
}

// A link sent while the dev client is still on its launcher or loading the bundle is dropped.
let androidBundled = false;

function androidReadyToLink(): boolean {
  return androidBundled || stopping;
}

async function waitForAndroidBundle(): Promise<void> {
  for (let attempt = 0; attempt < 240 && !androidReadyToLink(); attempt += 1)
    await delay(500);

  await delay(1500);
}

async function openNamedAndroidStorybook(deviceName: string): Promise<void> {
  const serial = await androidSerial(deviceName);

  await waitForAndroidBundle();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await openAndroidStorybook(serial);
    await delay(2000);

    if (await androidAppRunning(serial)) return;
  }

  throw new Error(`Android app did not stay open on ${deviceName}`);
}

async function linkToStorybook(deviceName: string): Promise<void> {
  await delay(3000);

  if (stopping) return;

  const iosDevice = await findIosDevice(deviceName);

  await (iosDevice
    ? openIosStorybook(iosDevice)
    : openNamedAndroidStorybook(deviceName));

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
  const browser = spawn('open', [webUrl], { cwd: repoRoot, stdio: 'ignore' });
  browser.once('error', (error) =>
    console.error(`Could not open the browser: ${error.message}`),
  );
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
