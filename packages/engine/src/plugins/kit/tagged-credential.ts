import type { Argo } from '@repo/contracts/plugins/argo-api';
import { z } from 'zod';

export type Secrets = Pick<Argo['secrets'], 'get' | 'set'>;

const Stored = z.object({ flow: z.string(), secret: z.string() });

function stored(value: string | null): z.infer<typeof Stored> | undefined {
  if (value === null) return;

  try {
    return Stored.safeParse(JSON.parse(value)).data;
  } catch {
    return;
  }
}

function readSecret(
  raw: string | null,
  key: string,
  legacy: boolean,
): string | null {
  const value = stored(raw);

  return value ? forFlow(value, key) : legacySecret(raw, legacy);
}

export function tagged<S extends Secrets>(
  secrets: S,
  key: string,
  legacy: boolean,
): S {
  return {
    ...secrets,
    get: async (id: string): Promise<string | null> =>
      readSecret(await secrets.get(id), key, legacy),
    set: (id: string, secret: string): Promise<void> =>
      secrets.set(id, JSON.stringify({ flow: key, secret })),
  };
}

const forFlow = (value: z.infer<typeof Stored>, key: string): string | null =>
  value.flow === key ? value.secret : null;

const legacySecret = (raw: string | null, legacy: boolean): string | null =>
  legacy ? raw : null;
