import { readFile, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ACPAgent } from '@repo/contracts';
import { z } from 'zod';
import { resolveInstallRecipe } from '../install/materialization/recipe';

const PackageMetadata = z.object({ name: z.string(), version: z.string() });

type Metadata = Partial<z.infer<typeof PackageMetadata>>;

// A folder with no readable package.json names no package.
const readMetadata = async (folder: string): Promise<Metadata> => {
  try {
    const text = await readFile(join(folder, 'package.json'), 'utf8');
    const parsed = PackageMetadata.safeParse(JSON.parse(text));

    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
};

const versionAbove = async (
  folder: string,
  name: string,
): Promise<string | undefined> => {
  const metadata = await readMetadata(folder);

  if (metadata.name === name) return metadata.version;

  return parentVersion(folder, name);
};

const parentVersion = (
  folder: string,
  name: string,
): Promise<string | undefined> | undefined => {
  const parent = dirname(folder);

  return parent === folder ? undefined : versionAbove(parent, name);
};

// The installed version of the npm package whose command this PATH file is: the nearest package.json above the real file that names it.
export const installedPackageVersion = async (
  file: string,
  name: string,
): Promise<string | undefined> => {
  const real = await realpath(file).catch(() => null);

  return real ? versionAbove(dirname(real), name) : undefined;
};

// The npm package an npx entry installs, whose command the Resolver finds on PATH.
export const npmPackageName = (entry: ACPAgent): string | undefined => {
  const recipe = entry.distribution.npx;

  return recipe && npxReleaseName(entry, recipe);
};

// An entry whose npx package cannot be read is still searched for, just without a version.
const npxReleaseName = (
  entry: ACPAgent,
  recipe: NonNullable<ACPAgent['distribution']['npx']>,
): string | undefined => {
  try {
    const release = resolveInstallRecipe(entry, { kind: 'npx', recipe });

    return release.kind === 'npx' ? release.name : undefined;
  } catch {
    return undefined;
  }
};
