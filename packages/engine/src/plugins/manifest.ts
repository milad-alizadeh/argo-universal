import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PluginManifest } from '@repo/contracts';
import { gtr, ltr, satisfies, valid, validRange } from 'semver';

// A Server version no range written for a real Argo release reaches; a range it satisfies has no upper bound.
const unboundedProbe = '999999.0.0';

// Dev builds may carry prerelease versions, which ordinary ranges would otherwise exclude.
const semverOptions = { includePrerelease: true };

// Validation finishes before any contribution can reach the App.
export async function readManifest(
  directory: string,
  version: string,
): Promise<PluginManifest> {
  const manifest = PluginManifest.parse(
    JSON.parse(await readFile(join(directory, 'plugin.json'), 'utf8')),
  );

  validateVersion(manifest, version);
  await requireMain(directory, manifest.main);

  return manifest;
}

function engineRange(value: string): string {
  const range = validRange(value);

  if (!range) throw new Error('engines.argo must be a semver range');

  if (satisfies(unboundedProbe, range, semverOptions))
    throw new Error('engines.argo must never be * or have no upper bound');

  return range;
}

function validateVersion(manifest: PluginManifest, version: string): void {
  if (!valid(manifest.version))
    throw new Error('version must be a semver version');
  const range = engineRange(manifest.engines.argo);

  if (satisfies(version, range, semverOptions)) return;

  throw new Error(incompatibility(manifest.engines.argo, range, version));
}

function incompatibility(
  declared: string,
  range: string,
  version: string,
): string {
  if (ltr(version, range, semverOptions))
    return `Requires Argo ${declared}; this Server is ${version}`;

  if (gtr(version, range, semverOptions))
    return `Supports Argo ${declared} only; this Server is ${version}, which is newer`;

  return `Does not support Argo ${version}; it declares ${declared}`;
}

// The entry file must exist; it is checked, never imported.
async function requireMain(directory: string, main: string): Promise<void> {
  const file = await stat(join(directory, main)).catch(() => null);

  if (!file?.isFile()) throw new Error(`main file ${main} is missing`);
}
