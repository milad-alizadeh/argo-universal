import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const OfflineRegistry = z.object({ offline: z.literal(true) });

// Answers with the registry file's text, as the real fetcher answers with the response body.
export function createFileAgentsFetcher(
  registryPath: string,
): (signal: AbortSignal) => Promise<string> {
  return async (signal): Promise<string> => {
    const text = await readFile(registryPath, { encoding: 'utf8', signal });

    if (OfflineRegistry.safeParse(JSON.parse(text)).success)
      throw new Error('Registry is offline');

    return text;
  };
}
