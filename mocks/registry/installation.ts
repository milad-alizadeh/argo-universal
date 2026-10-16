import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
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
  bytes?: Uint8Array;
};

const pollMilliseconds = 50;

const readScenario = async (
  path?: string,
): Promise<z.infer<typeof InstallationScenario>> =>
  path
    ? InstallationScenario.parse(JSON.parse(await readFile(path, 'utf8')))
    : { outcome: 'success', released: true };

async function awaitInstallerRelease(
  input: Pick<ToolInput, 'signal'>,
  path?: string,
): Promise<void> {
  while (!(await readScenario(path)).released)
    await setTimeout(pollMilliseconds, undefined, { signal: input.signal });
  input.signal.throwIfAborted();

  if ((await readScenario(path)).outcome === 'failure')
    throw new Error('Fixture package download failed');
}

const isInstall = (input: ToolInput): boolean =>
  basename(input.executable) === 'npm' ||
  (input.executable === 'uv' && input.args[0] === 'pip');

const requireRuntime = async (path?: string): Promise<void> => {
  if ((await readScenario(path)).outcome === 'missing-runtime')
    throw new Error('Node.js is required on the Server');
};

async function runTool(
  input: ToolInput,
  options: InstallationMockOptions,
): Promise<string> {
  input.signal.throwIfAborted();
  await requireRuntime(options.scenarioPath);
  await prepareEnvironment(input);

  if (!isInstall(input))
    return basename(input.executable) === 'node'
      ? 'v24.0.0'
      : 'Runtime available';
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
    await awaitInstallerRelease({ signal }, options.scenarioPath);

    return options.bytes ?? installationExecutable;
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
