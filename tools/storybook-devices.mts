import { execFile } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { resolveExecutable } from '@repo/executables';

const execute = promisify(execFile);

type CommandOutput = { stdout: string; stderr: string };

const run = (command: string, args: string[]): Promise<CommandOutput> =>
  execute(resolveExecutable(command), args, { encoding: 'utf8' });

function simulatorId(line: string): string | null {
  return line.match(/\(([A-F0-9-]{36})\)/)?.[1] ?? null;
}

export async function findIosDevice(
  deviceName: string,
): Promise<string | null> {
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
    serials.map((serial) => matchAndroidDevice(serial, deviceName)),
  );

  return matches.find((serial) => serial !== null) ?? null;
}

async function matchAndroidDevice(
  serial: string,
  deviceName: string,
): Promise<string | null> {
  const { stdout } = await run('adb', ['-s', serial, 'emu', 'avd', 'name']);

  return stdout.trim().split(/\r?\n/)[0] === deviceName ? serial : null;
}

export async function openIosStorybook(udid: string): Promise<void> {
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

async function waitForAndroidBundle(ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 240 && !ready(); attempt += 1)
    await delay(500);

  await delay(1500);
}

export async function openNamedAndroidStorybook(
  deviceName: string,
  ready: () => boolean,
): Promise<void> {
  const serial = await androidSerial(deviceName);

  await waitForAndroidBundle(ready);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await openAndroidStorybook(serial);
    await delay(2000);

    if (await androidAppRunning(serial)) return;
  }

  throw new Error(`Android app did not stay open on ${deviceName}`);
}
