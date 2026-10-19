import { z } from 'zod';
import type { PaperClient } from './client.mts';
import { required, type Snapshot } from './model.mts';

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

function references(text: string): string[] {
  return [...text.matchAll(/var\((--[\w-]+)/g)].map((match) =>
    required(match[1]),
  );
}

function matchingToken(
  name: string,
  source: Tokens,
  destination: Tokens,
): string | number {
  const value = source.get(name);

  if (value === undefined || destination.get(name) !== value)
    throw new Error(
      `${name}: missing or different destination token; align the Paper tokens before syncing`,
    );

  return value;
}

export function checkTokens(
  master: Snapshot,
  source: Tokens,
  destination: Tokens,
): void {
  const queue = references(JSON.stringify(master.nodes));
  const visited = new Set<string>();

  for (const name of queue) {
    if (visited.has(name)) continue;
    visited.add(name);
    queue.push(...references(String(matchingToken(name, source, destination))));
  }
}
