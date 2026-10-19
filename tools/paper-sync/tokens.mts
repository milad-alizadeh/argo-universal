import { z } from 'zod';
import type { PaperClient } from './client.mts';
import type { Snapshot } from './model.mts';

const tokensSchema = z.object({
  tokens: z.array(
    z.object({ name: z.string(), value: z.union([z.string(), z.number()]) }),
  ),
});
export type Tokens = Map<string, string | number>;

export async function readTokens(
  client: PaperClient,
  fileId: string,
): Promise<Tokens> {
  const { tokens } = await client.read('get_tokens', { fileId }, tokensSchema);
  return new Map(tokens.map((token) => [token.name, token.value]));
}

export function checkTokens(
  master: Snapshot,
  source: Tokens,
  destination: Tokens,
): void {
  const queue = [
    ...JSON.stringify(master.nodes).matchAll(/var\((--[\w-]+)/g),
  ].map((match) => match[1]!);
  const visited = new Set<string>();
  for (const name of queue) {
    if (visited.has(name)) continue;
    visited.add(name);
    const value = source.get(name);
    if (value === undefined || destination.get(name) !== value)
      throw new Error(
        `${name}: missing or different destination token; align the Paper tokens before syncing`,
      );
    queue.push(
      ...[...String(value).matchAll(/var\((--[\w-]+)/g)].map(
        (match) => match[1]!,
      ),
    );
  }
}
