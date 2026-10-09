import { readFile } from 'node:fs/promises';
import { z } from 'zod';

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
