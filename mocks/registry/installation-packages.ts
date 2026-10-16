import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scriptedAgentCommand } from '../agent/scripted-agent-launch';
import type { ToolInput } from './installation';

const executableMode = 0o755;

const script = scriptedAgentCommand('reply').args[0];

if (!script) throw new Error('Scripted Agent needs an entry point');

export const installationExecutable = Buffer.from(
  `#!/usr/bin/env node\nprocess.argv[2] = 'reply';\nawait import(${JSON.stringify(pathToFileURL(script).href)});\n`,
);

async function installNpm(
  input: ToolInput,
  name: string,
  version: string,
): Promise<void> {
  const directory = join(input.cwd, 'node_modules', name);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ name, version, bin: 'agent.mjs' }),
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

const uvMetadataDirectory = (
  cwd: string,
  name: string,
  version: string,
): string =>
  join(
    cwd,
    '.venv',
    ...(process.platform === 'win32' ? ['Lib'] : ['lib', 'python3.12']),
    'site-packages',
    `${name}-${version}.dist-info`,
  );

async function writeUvMetadata(
  cwd: string,
  name: string,
  version: string,
): Promise<void> {
  const directory = uvMetadataDirectory(cwd, name, version);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'METADATA'),
    `Name: ${name}\nVersion: ${version}\n`,
  );
  await writeUvEntryPoints(directory, name);
}

async function installUv(
  input: ToolInput,
  name: string,
  version: string,
): Promise<void> {
  await writeUvMetadata(input.cwd, name, version);
  await writeFile(
    join(
      uvBinDirectory(input.cwd),
      process.platform === 'win32' ? `${name}.exe` : name,
    ),
    installationExecutable,
    { mode: executableMode },
  );
}

export const prepareEnvironment = async (input: ToolInput): Promise<void> => {
  if (input.executable === 'uv' && input.args[0] === 'venv')
    await createUvEnvironment(input);
};

export const installPackage = (
  input: ToolInput,
  name: string,
  version: string,
): Promise<void> =>
  basename(input.executable) === 'npm'
    ? installNpm(input, name, version)
    : installUv(input, name, version);

async function writeUvEntryPoints(
  directory: string,
  name: string,
): Promise<void> {
  await writeFile(
    join(directory, 'entry_points.txt'),
    `[console_scripts]\n${name} = fixture:main\n`,
  );
}
