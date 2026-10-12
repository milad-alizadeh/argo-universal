import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { rejectInstallMetadata } from './metadata-rejections';
const readPythonMetadata = async (path: string): Promise<string> => {
  try {
    return await readFile(path, 'utf8');
  } catch {
    throw rejectInstallMetadata('Installed Python package metadata is missing');
  }
};
import type { PackageInput } from './packages';
const normalizeName = (name: string): string =>
  name.toLowerCase().replaceAll(/[-_.]+/g, '-');
const uvTool = (input: PackageInput, args: string[]): Promise<string> =>
  input.ports.runTool({
    executable: 'uv',
    args,
    cwd: input.directory,
    signal: input.signal,
  });
const pythonPath = (directory: string): string =>
  join(
    directory,
    '.venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );
const sitePackages = async (directory: string): Promise<string> => {
  if (process.platform === 'win32')
    return join(directory, '.venv', 'Lib', 'site-packages');
  const lib = join(directory, '.venv', 'lib');
  const python = (await readdir(lib)).find((name) =>
    /^python\d+\.\d+$/.test(name),
  );
  if (!python)
    throw rejectInstallMetadata(
      'Installed Python environment has no package metadata',
    );
  return join(lib, python, 'site-packages');
};
const metadataField = (metadata: string, field: string): string | undefined =>
  metadata
    .split('\n')
    .find((line) => line.startsWith(`${field}: `))
    ?.slice(field.length + 2)
    .trim();
const metadataName = (metadata: string): string =>
  normalizeName(metadataField(metadata, 'Name') ?? '');
const requirePythonRelease = (
  metadata: string,
  input: PackageInput,
): boolean => {
  if (metadataName(metadata) !== normalizeName(input.recipe.name)) return false;
  if (metadataField(metadata, 'Version') !== input.recipe.version)
    throw rejectInstallMetadata(
      'Installed Python package does not match the selected release',
    );
  return true;
};
const isPythonRelease = async (
  directory: string,
  input: PackageInput,
): Promise<boolean> =>
  requirePythonRelease(
    await readPythonMetadata(join(directory, 'METADATA')),
    input,
  );
const packageMetadataDirectory = async (
  input: PackageInput,
): Promise<string> => {
  const site = await sitePackages(input.directory);
  for (const name of (await readdir(site)).filter((entry) =>
    entry.endsWith('.dist-info'),
  )) {
    const directory = join(site, name);
    if (await isPythonRelease(directory, input)) return directory;
  }
  throw rejectInstallMetadata(
    'Installed Python package has no release metadata',
  );
};
const consoleScripts = (content: string): string[] => {
  const section = content.split('[console_scripts]')[1]?.split('[')[0] ?? '';
  return section
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => (line.split('=')[0] ?? '').trim());
};
const soleScript = (scripts: string[]): string | undefined =>
  scripts.length === 1 ? scripts[0] : undefined;
const selectScript = (scripts: string[], name: string): string => {
  const exact = scripts.find(
    (script) => normalizeName(script) === normalizeName(name),
  );
  if (exact) return exact;
  const sole = soleScript(scripts);
  if (sole) return sole;
  throw rejectInstallMetadata(
    'Installed Python package has no unambiguous launch file',
  );
};
const uvExecutable = async (input: PackageInput): Promise<string> => {
  const metadata = await packageMetadataDirectory(input);
  const script = selectScript(
    consoleScripts(
      await readPythonMetadata(join(metadata, 'entry_points.txt')),
    ),
    input.recipe.name,
  );
  return join(
    '.venv',
    process.platform === 'win32' ? 'Scripts' : 'bin',
    process.platform === 'win32' ? `${script}.exe` : script,
  );
};
const createUvEnvironment = (input: PackageInput): Promise<string> =>
  uvTool(input, [
    'venv',
    '--relocatable',
    '--no-python-downloads',
    join(input.directory, '.venv'),
  ]);
const uvInstallArgs = (input: PackageInput): string[] => [
  'pip',
  'install',
  '--python',
  pythonPath(input.directory),
  '--no-python-downloads',
  '--',
  input.recipe.package,
];
export const installUv = async (input: PackageInput): Promise<string> => {
  await createUvEnvironment(input);
  await uvTool(input, uvInstallArgs(input));
  return uvExecutable(input);
};
