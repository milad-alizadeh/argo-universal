import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const OfflineRegistry = z.object({ offline: z.literal(true) });

export function createFileRegistryPort(registryPath: string): {
  readRegistry(signal: AbortSignal): Promise<unknown>;
} {
  return {
    readRegistry: async (signal): Promise<unknown> => {
      const response: unknown = JSON.parse(
        await readFile(registryPath, { encoding: 'utf8', signal }),
      );
      if (OfflineRegistry.safeParse(response).success)
        throw new Error('Registry is offline');
      return response;
    },
  };
}
