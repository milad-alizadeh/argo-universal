import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PluginManifest } from '@repo/contracts/plugins';
import { pluginInstructionsLimit } from '@repo/contracts/plugins/manifest-fields';
import { productName } from '@repo/contracts/product-identity';
import { gtr, ltr, satisfies, valid, validRange } from 'semver';

// A Server version no range written for a real Argo release reaches; a range it satisfies has no upper bound.
const unboundedProbe = '999999.0.0';

// Dev builds may carry prerelease versions, which ordinary ranges would otherwise exclude.
const semverOptions = { includePrerelease: true };

// A refusal of one manifest field, named by its path in plugin.json.
export class ManifestFieldError extends Error {
  constructor(
    readonly field: string[],
    message: string,
  ) {
    super(message);
  }
}

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
  await requireInstructions(directory, manifest.contributes.instructions);

  return manifest;
}

const engineError = (message: string): ManifestFieldError =>
  new ManifestFieldError(['engines', 'argo'], message);

function engineRange(value: string): string {
  const range = validRange(value);

  if (!range) throw engineError('engines.argo must be a semver range');

  if (satisfies(unboundedProbe, range, semverOptions))
    throw engineError('engines.argo must never be * or have no upper bound');

  return range;
}

function validateVersion(manifest: PluginManifest, version: string): void {
  if (!valid(manifest.version))
    throw new ManifestFieldError(
      ['version'],
      'version must be a semver version',
    );
  const range = engineRange(manifest.engines.argo);

  if (satisfies(version, range, semverOptions)) return;

  throw engineError(incompatibility(manifest.engines.argo, range, version));
}

function incompatibility(
  declared: string,
  range: string,
  version: string,
): string {
  if (ltr(version, range, semverOptions))
    return `Requires ${productName} ${declared}; this Server is ${version}`;

  if (gtr(version, range, semverOptions))
    return `Supports ${productName} ${declared} only; this Server is ${version}, which is newer`;

  return `Does not support ${productName} ${version}; it declares ${declared}`;
}

// The entry file must exist; it is checked, never imported.
async function requireMain(directory: string, main: string): Promise<void> {
  const file = await stat(join(directory, main)).catch(() => null);

  if (!file?.isFile())
    throw new ManifestFieldError(['main'], `main file ${main} is missing`);
}

// The Plugin instructions file must exist and stay under the cap; it is read as text, never imported.
async function requireInstructions(
  directory: string,
  file: string | undefined,
): Promise<void> {
  if (file !== undefined)
    requireWithinCap(file, await readText(directory, file));
}

const readText = (directory: string, file: string): Promise<string | null> =>
  readFile(join(directory, file), 'utf8').catch(() => null);

const instructionsError = (message: string): ManifestFieldError =>
  new ManifestFieldError(['contributes', 'instructions'], message);

function requireWithinCap(file: string, text: string | null): void {
  if (text === null)
    throw instructionsError(`instructions file ${file} is missing`);

  if (text.trim().length <= pluginInstructionsLimit) return;
  throw instructionsError(
    `instructions file ${file} is over ${pluginInstructionsLimit} characters`,
  );
}
