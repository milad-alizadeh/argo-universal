import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { npmPackages } from './catalog';

const OfflineRegistry = z.object({ offline: z.literal(true) });

export function createFileAgentsFetcher(
  registryPath: string,
): (signal: AbortSignal) => Promise<unknown> {
  return async (signal): Promise<unknown> => {
    const response: unknown = JSON.parse(
      await readFile(registryPath, { encoding: 'utf8', signal }),
    );
    if (OfflineRegistry.safeParse(response).success)
      throw new Error('Registry is offline');
    return response;
  };
}

// npm's registry for the fixture packages; a release it does not list is missing, as npm answers 404.
export function createNpmPackageFetcher(
  packages: Record<string, unknown> = npmPackages,
): (
  release: { name: string; version: string },
  signal: AbortSignal,
) => Promise<unknown> {
  return async ({ name, version }, signal): Promise<unknown> => {
    signal.throwIfAborted();
    const found = packages[`${name}@${version}`];
    if (found === undefined) throw new Error(`npm has no ${name}@${version}`);
    return found;
  };
}
