import { readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { z } from 'zod';
import {
  installationExecutable,
  installPackage,
  prepareEnvironment,
} from './installation-packages';

export { installationExecutable } from './installation-packages';

export const InstallationScenario = z.object({
  outcome: z.enum(['success', 'missing-runtime', 'failure']),
  released: z.boolean(),
  version: z.string().optional(),
});

export type ToolInput = {
  executable: string;
  args: readonly string[];
  cwd: string;
  env?: Record<string, string>;
  signal: AbortSignal;
};

type InstallationMockOptions = {
  packageName?: string;
  scenarioPath?: string;
  version?: string;
  // Where `brew install node|uv` puts the tool, on the Server's PATH.
  toolsPath?: string;
};

const pollMilliseconds = 50;

const readScenario = async (
  path?: string,
): Promise<z.infer<typeof InstallationScenario>> =>
  path
    ? InstallationScenario.parse(JSON.parse(await readFile(path, 'utf8')))
    : { outcome: 'success', released: true };

async function awaitInstallerRelease(
  input: ToolInput,
  path?: string,
): Promise<void> {
  while (!(await readScenario(path)).released)
    await setTimeout(pollMilliseconds, undefined, { signal: input.signal });
  input.signal.throwIfAborted();

  if ((await readScenario(path)).outcome === 'failure')
    throw new Error('Fixture package download failed');
}

const isInstall = (input: ToolInput): boolean =>
  input.executable === 'npm' ||
  (input.executable === 'uv' && input.args[0] === 'pip');

const requireRuntime = async (path?: string): Promise<void> => {
  if ((await readScenario(path)).outcome === 'missing-runtime')
    throw new Error('Node.js is required on the Server');
};

const toolStub = '#!/bin/sh\nexit 0\n';

const placeStub = (target: string): Promise<void> =>
  writeFile(target, toolStub, { mode: 0o755 });

type Bottle = (toolsPath: string) => Promise<void>;

// What `brew install` leaves on PATH: Node.js (the test's own) with npm, or uv.
const bottles = {
  node: async (toolsPath: string): Promise<void> => {
    await symlink(process.execPath, join(toolsPath, 'node'));
    await placeStub(join(toolsPath, 'npm'));
  },
  uv: (toolsPath: string): Promise<void> => placeStub(join(toolsPath, 'uv')),
} satisfies Record<string, Bottle>;

const isBottled = (tool: string): tool is keyof typeof bottles =>
  Object.hasOwn(bottles, tool);

const bottleFor = (tool = ''): Bottle => {
  if (!isBottled(tool)) throw new Error(`No bottle for ${tool}`);

  return bottles[tool];
};

// Homebrew follows the same held/failed scenario as the Agent installer, then leaves the tool on PATH.
async function brewInstall(
  input: ToolInput,
  options: InstallationMockOptions,
): Promise<string> {
  const bottle = bottleFor(input.args[1]);
  const { toolsPath } = options;

  if (!toolsPath) throw new Error('brew needs the toolsPath option');
  await awaitInstallerRelease(input, options.scenarioPath);
  await bottle(toolsPath);

  return '';
}

async function runTool(
  input: ToolInput,
  options: InstallationMockOptions,
): Promise<string> {
  input.signal.throwIfAborted();

  if (input.executable === 'brew') return brewInstall(input, options);
  await requireRuntime(options.scenarioPath);
  await prepareEnvironment(input);

  if (!isInstall(input)) return 'Runtime available';
  await awaitInstallerRelease(input, options.scenarioPath);
  await installSelectedPackage(input, options);

  return '';
}

const installationVersion = async (
  options: InstallationMockOptions,
): Promise<string> =>
  (await readScenario(options.scenarioPath)).version ??
  options.version ??
  '1.2.3';

type InstallationPorts = {
  runTool: (input: ToolInput) => Promise<string>;
  download: (url: string, signal: AbortSignal) => Promise<Uint8Array>;
};

// Only the external package manager and download responses are replaced.
export const createInstallationPorts = (
  options: InstallationMockOptions = {},
): InstallationPorts => ({
  runTool: (input) => runTool(input, options),
  download: async (_, signal) => {
    signal.throwIfAborted();

    return installationExecutable;
  },
});

const installSelectedPackage = async (
  input: ToolInput,
  options: InstallationMockOptions,
): Promise<void> =>
  installPackage(
    input,
    options.packageName ?? 'fixture-install',
    await installationVersion(options),
  );
