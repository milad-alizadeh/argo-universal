import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { type NpmPackageMetadata, npmPackages } from './catalog';

const OfflineRegistry = z.object({ offline: z.literal(true) });

type NpmRelease = { name: string; version: string };
// The Registry port: the Agent list, or npm's metadata for an npx package release.
export type RegistryFetch = (
  signal: AbortSignal,
  npmRelease?: NpmRelease,
) => Promise<unknown>;
type NpmPackages = Record<string, NpmPackageMetadata>;

// npm's answer for a fixture release; one it does not list is missing, as npm answers 404.
function answerNpm(
  packages: NpmPackages,
  { name, version }: NpmRelease,
): NpmPackageMetadata {
  const found = packages[`${name}@${version}`];
  if (!found) throw new Error(`npm has no ${name}@${version}`);
  return found;
}

// The Registry fixture at the Registry port, from memory.
export function serveRegistry(
  registry: unknown,
  packages: NpmPackages = npmPackages,
): RegistryFetch {
  return async (signal, npmRelease): Promise<unknown> => {
    signal.throwIfAborted();
    return npmRelease ? answerNpm(packages, npmRelease) : registry;
  };
}

// The Registry port with npm's part answered from the fixture, so a test scripts only the Agent list.
export function withNpmFixture(
  fetchList: (signal: AbortSignal) => Promise<unknown>,
  packages: NpmPackages = npmPackages,
): RegistryFetch {
  return async (signal, npmRelease): Promise<unknown> =>
    npmRelease ? answerNpm(packages, npmRelease) : fetchList(signal);
}

// The Registry fixture at the Registry port, its Agent list read from a file that steps replace.
export function createFileAgentsFetcher(
  registryPath: string,
  packages: NpmPackages = npmPackages,
): RegistryFetch {
  return async (signal, npmRelease): Promise<unknown> => {
    if (npmRelease) return answerNpm(packages, npmRelease);
    const response: unknown = JSON.parse(
      await readFile(registryPath, { encoding: 'utf8', signal }),
    );
    if (OfflineRegistry.safeParse(response).success)
      throw new Error('Registry is offline');
    return response;
  };
}
