import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { Connection } from '#features/connection';
import type { ServerConnections } from './open-server-connections';

const historyKey = 'server-history';

// When this Device paired with a Server, and the last moment a Connection to it was open; each is a time in milliseconds.
export interface ServerHistory {
  pairedAt?: number;
  lastConnectedAt?: number;
}

const History = z.record(
  z.string(),
  z.object({
    pairedAt: z.number().optional(),
    lastConnectedAt: z.number().optional(),
  }),
);

type Histories = Record<string, ServerHistory>;

async function read(): Promise<Histories> {
  try {
    const saved = await AsyncStorage.getItem(historyKey);

    return saved === null ? {} : History.parse(JSON.parse(saved));
  } catch {
    return {};
  }
}

// Writes run one after another, so no two of them overwrite each other's entry.
let writes = Promise.resolve();

function failed(cause: unknown): void {
  console.error('Could not keep when Servers were paired and reached', cause);
}

const without = (all: Histories, key: string): Histories =>
  Object.fromEntries(Object.entries(all).filter(([id]) => id !== key));

type Change = (was: ServerHistory) => ServerHistory | null;

async function write(key: string, change: Change): Promise<void> {
  const all = await read();
  const next = change(all[key] ?? {});
  const kept = without(all, key);

  await AsyncStorage.setItem(
    historyKey,
    JSON.stringify(next ? { ...kept, [key]: next } : kept),
  );
}

const edit = (key: string, change: Change): Promise<void> => {
  writes = writes.then(() => write(key, change)).catch(failed);

  return writes;
};

// A Server paired again is paired as of now.
export const notePaired = (key: string, at: number): Promise<void> =>
  edit(key, (was) => ({ ...was, pairedAt: at }));

export const noteConnected = (key: string, at: number): Promise<void> =>
  edit(key, (was) => ({ ...was, lastConnectedAt: at }));

// A Server this Device has unpaired from keeps no history.
export const forgetServerHistory = (key: string): Promise<void> =>
  edit(key, () => null);

// The history of one Server; empty until it has been read, and for a Server with none.
export function useServerHistory(key: string): ServerHistory {
  const [history, setHistory] = useState<ServerHistory>({});

  useEffect(() => {
    void read().then((all) => setHistory(all[key] ?? {}));
  }, [key]);

  return history;
}

/*
 * Notes the last moment each Connection was open: when it opens, and when it stops being open, so a Server that has
 * gone quiet says when it last answered rather than when this App last looked.
 */
function watch(key: string, connection: Connection): () => void {
  let was = connection.state();

  if (was === 'open') void noteConnected(key, Date.now());

  return connection.subscribe(() => {
    const now = connection.state();

    if (now === 'open' || was === 'open') void noteConnected(key, Date.now());

    was = now;
  });
}

const watchAll = (connections: ServerConnections): (() => void) => {
  const stops = [...connections].map(([key, open]) =>
    watch(key, open.connection),
  );

  return (): void => {
    for (const stop of stops) stop();
  };
};

export function useRememberConnected(connections: ServerConnections): void {
  useEffect(() => watchAll(connections), [connections]);
}
