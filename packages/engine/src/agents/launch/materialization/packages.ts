import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { jsonCodec } from '../../../lib/json-codec';

const PackageMetadata = z.object({
  name: z.string(),
  version: z.string(),
  bin: z.union([z.string(), z.record(z.string(), z.string())]),
});

const PackageJson = jsonCodec(PackageMetadata);

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
    throw new Error('Installed npm package has no unambiguous launch file');

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
    throw new Error('Installed npm package metadata is malformed or missing');
  }
};

export const npmInstallArgs = (
  directory: string,
  specification: string,
): string[] => [
  'install',
  '--prefix',
  directory,
  '--no-audit',
  '--no-fund',
  '--save-exact',
  '--',
  specification,
];

export const readNpmExecutable = async (
  directory: string,
  name: string,
): Promise<string> => {
  const folder = join(directory, 'node_modules', name);
  const metadata = await readPackageMetadata(folder);

  if (metadata.name !== name)
    throw new Error('Installed npm package name does not match');

  return join(folder, selectedBin(metadata.bin, name));
};
