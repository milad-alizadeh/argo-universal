import { readFile } from 'node:fs/promises';
import type { ACPAgentRegistry } from '@repo/contracts';
import { z } from 'zod';
import { type NpmPackageMetadata, npmPackages } from './catalog';

const OfflineRegistry = z.object({ offline: z.literal(true) });

type NpmRelease = { name: string; version: string };

// The Registry port answers with a document's text, as the real fetcher answers with the response body: the Agent list, or npm's metadata for an npx package release.
export type RegistryFetch = (
  signal: AbortSignal,
  npmRelease?: NpmRelease,
) => Promise<string>;

type NpmPackages = Record<string, NpmPackageMetadata>;

// npm's answer for a fixture release; one it does not list is missing, as npm answers 404.
function answerNpm(
  packages: NpmPackages,
  { name, version }: NpmRelease,
): string {
  const found = packages[`${name}@${version}`];

  if (!found) throw new Error(`npm has no ${name}@${version}`);

  return JSON.stringify(found);
}

// The Registry fixture at the Registry port, from memory.
export function serveRegistry(
  registry: ACPAgentRegistry,
  packages: NpmPackages = npmPackages,
): RegistryFetch {
  return async (signal, npmRelease): Promise<string> => {
    signal.throwIfAborted();

    return npmRelease
      ? answerNpm(packages, npmRelease)
      : JSON.stringify(registry);
  };
}

// The Registry port with npm's part answered from the fixture, so a test scripts only the Agent list.
export function withNpmFixture(
  fetchList: (signal: AbortSignal) => Promise<string>,
  packages: NpmPackages = npmPackages,
): RegistryFetch {
  return async (signal, npmRelease): Promise<string> =>
    npmRelease ? answerNpm(packages, npmRelease) : fetchList(signal);
}

// The Registry fixture at the Registry port, its Agent list read as text from a file that steps replace.
export function createFileAgentsFetcher(
  registryPath: string,
  packages: NpmPackages = npmPackages,
): RegistryFetch {
  return async (signal, npmRelease): Promise<string> => {
    if (npmRelease) return answerNpm(packages, npmRelease);

    const text = await readFile(registryPath, { encoding: 'utf8', signal });

    if (OfflineRegistry.safeParse(JSON.parse(text)).success)
      throw new Error('Registry is offline');

    return text;
  };
}
