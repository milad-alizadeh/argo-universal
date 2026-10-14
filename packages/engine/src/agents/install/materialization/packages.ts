import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { jsonCodec } from '../../../lib/json-codec';
import type { InstallPorts, InstallToolInput } from '../ports';
import { rejectInstallMetadata } from './metadata-rejections';
import type { InstallRecipe } from './recipe';
import { installUv } from './uv-packages';

type PackageRecipe = Exclude<InstallRecipe, { kind: 'binary' }>;

export type PackageInput = {
  directory: string;
  recipe: PackageRecipe;
  signal: AbortSignal;
  ports: InstallPorts;
};

const PackageMetadata = z.object({
  name: z.string(),
  version: z.string(),
  bin: z.union([z.string(), z.record(z.string(), z.string())]),
});

const PackageJson = jsonCodec(PackageMetadata);

const toolInput = (
  input: PackageInput,
  executable: string,
  args: readonly string[],
): InstallToolInput => ({
  executable,
  args,
  cwd: input.directory,
  signal: input.signal,
});

const unambiguousNpmBin = (
  bins: Record<string, string>,
  name: string,
): string | undefined => {
  const exact = bins[basename(name)];

  if (exact) return exact;

  return Object.keys(bins).length === 1 ? Object.values(bins)[0] : undefined;
};

const selectedBin = (
  bin: z.infer<typeof PackageMetadata>['bin'],
  name: string,
): string => {
  if (typeof bin === 'string') return bin;
  const command = unambiguousNpmBin(bin, name);

  if (!command)
    throw rejectInstallMetadata(
      'Installed npm package has no unambiguous launch file',
    );

  return command;
};

const readPackageMetadata = async (
  directory: string,
): Promise<z.infer<typeof PackageMetadata>> => {
  try {
    return PackageJson.parse(
      await readFile(join(directory, 'package.json'), 'utf8'),
    );
  } catch {
    throw rejectInstallMetadata(
      'Installed npm package metadata is malformed or missing',
    );
  }
};

const npmExecutable = async ({
  directory,
  recipe,
}: PackageInput): Promise<string> => {
  const folder = join('node_modules', recipe.name),
    metadata = await readPackageMetadata(join(directory, folder));

  if (metadata.name !== recipe.name || metadata.version !== recipe.version)
    throw rejectInstallMetadata(
      'Installed npm package does not match the selected release',
    );

  return join(folder, selectedBin(metadata.bin, recipe.name));
};

const npmInstallArgs = (input: PackageInput): string[] => [
  'install',
  '--prefix',
  input.directory,
  '--no-audit',
  '--no-fund',
  '--save-exact',
  '--',
  input.recipe.package,
];

const installNpm = async (input: PackageInput): Promise<string> => {
  await input.ports.runTool(toolInput(input, 'node', ['--version']));
  await input.ports.runTool(toolInput(input, 'npm', npmInstallArgs(input)));

  return npmExecutable(input);
};

export const materializePackage = (input: PackageInput): Promise<string> =>
  input.recipe.kind === 'npx' ? installNpm(input) : installUv(input);
