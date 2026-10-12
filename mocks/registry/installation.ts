import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { scriptedAgentCommand } from '../agent/scripted-agent-launch';

export const InstallationScenario = z.object({
  outcome: z.enum(['success', 'missing-runtime', 'failure']),
  released: z.boolean(),
});
type ToolInput = {
  executable: string;
  args: readonly string[];
  cwd: string;
  env?: Record<string, string>;
  signal: AbortSignal;
};
type InstallationMockOptions = { packageName?: string; scenarioPath?: string };
const executableMode = 0o755;
const pollMilliseconds = 50;
const script = scriptedAgentCommand('reply').args[0];
if (!script) throw new Error('Scripted Agent needs an entry point');
export const installationExecutable = Buffer.from(
  `#!/usr/bin/env node\nprocess.argv[2] = 'reply';\nawait import(${JSON.stringify(pathToFileURL(script).href)});\n`,
);
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
async function installNpm(input: ToolInput, name: string): Promise<void> {
  const directory = join(input.cwd, 'node_modules', name);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ name, version: '1.2.3', bin: 'agent.mjs' }),
  );
  await writeFile(join(directory, 'agent.mjs'), installationExecutable, {
    mode: executableMode,
  });
}
const uvBinDirectory = (cwd: string): string =>
  join(cwd, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin');
async function createUvEnvironment(input: ToolInput): Promise<void> {
  const directory = uvBinDirectory(input.cwd);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, process.platform === 'win32' ? 'python.exe' : 'python'),
    installationExecutable,
    { mode: executableMode },
  );
}
const uvMetadataDirectory = (cwd: string, name: string): string =>
  join(
    cwd,
    '.venv',
    ...(process.platform === 'win32' ? ['Lib'] : ['lib', 'python3.12']),
    'site-packages',
    `${name}-1.2.3.dist-info`,
  );
async function writeUvMetadata(cwd: string, name: string): Promise<void> {
  const directory = uvMetadataDirectory(cwd, name);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'METADATA'),
    `Name: ${name}\nVersion: 1.2.3\n`,
  );
  await writeFile(
    join(directory, 'entry_points.txt'),
    `[console_scripts]\n${name} = fixture:main\n`,
  );
}
async function installUv(input: ToolInput, name: string): Promise<void> {
  await writeUvMetadata(input.cwd, name);
  await writeFile(
    join(
      uvBinDirectory(input.cwd),
      process.platform === 'win32' ? `${name}.exe` : name,
    ),
    installationExecutable,
    { mode: executableMode },
  );
}
const prepareEnvironment = async (input: ToolInput): Promise<void> => {
  if (input.executable === 'uv' && input.args[0] === 'venv')
    await createUvEnvironment(input);
};
const isInstall = (input: ToolInput): boolean =>
  input.executable === 'npm' ||
  (input.executable === 'uv' && input.args[0] === 'pip');
const installPackage = (input: ToolInput, name: string): Promise<void> =>
  input.executable === 'npm' ? installNpm(input, name) : installUv(input, name);
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
  if (!isInstall(input)) return 'Runtime available';
  await awaitInstallerRelease(input, options.scenarioPath);
  await installPackage(input, options.packageName ?? 'fixture-install');
  return '';
}
// Only the external package manager and download responses are replaced.
export const createInstallationPorts = (
  options: InstallationMockOptions = {},
): {
  runTool: (input: ToolInput) => Promise<string>;
  download: (url: string, signal: AbortSignal) => Promise<Uint8Array>;
} => ({
  runTool: (input) => runTool(input, options),
  download: async (_, signal) => {
    signal.throwIfAborted();
    return installationExecutable;
  },
});
