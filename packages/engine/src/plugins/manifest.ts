import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PluginManifest } from '@repo/contracts';
import { satisfies, valid, validRange } from 'semver';

// Validation finishes before any contribution can reach the App.
export async function readManifest(
  directory: string,
  version: string,
): Promise<PluginManifest> {
  const manifest = PluginManifest.parse(
    JSON.parse(await readFile(join(directory, 'plugin.json'), 'utf8')),
  );

  validateVersion(manifest, version);

  return manifest;
}

function engineRange(value: string): string {
  const range = validRange(value);

  if (!range) throw new Error('engines.argo must be a semver range');

  if (range.split('||').some((part) => part.trim() === '*'))
    throw new Error('engines.argo must never be *');

  return range;
}

function validateVersion(manifest: PluginManifest, version: string): void {
  if (!valid(manifest.version))
    throw new Error('version must be a semver version');
  const range = engineRange(manifest.engines.argo);

  if (!satisfies(version, range))
    throw new Error(
      `Requires Argo ${manifest.engines.argo}; this Server is ${version}`,
    );
}
