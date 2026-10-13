import type { SessionListUpdate } from '@repo/contracts';
import { onTestFinished, vi } from 'vitest';
import { countDatabaseReads, openTestDatabase } from './database';
import { startEngineTestHost } from './engine';
import { scriptedEngineInput } from './scripted-engine';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

export const startCountedList = async (
  agent: string,
): Promise<{
  host: EngineHost;
  counted: ReturnType<typeof countDatabaseReads>;
}> => {
  const { database, remove } = openTestDatabase({ agent });
  onTestFinished(remove);
  const host = await startEngineTestHost({
    database,
    ...scriptedEngineInput(undefined, agent),
  });
  const counted = countDatabaseReads(host.database);
  return { host, counted };
};

export const watchList = async (
  host: EngineHost,
): Promise<{
  controller: AbortController;
  caller: EngineHost['caller'];
  updates: AsyncIterator<SessionListUpdate>;
}> => {
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = host.createCaller({ signal: controller.signal });
  const updates = (await caller.session.listUpdates())[Symbol.asyncIterator]();
  return { controller, caller, updates };
};

export function useListTimers(): void {
  vi.useFakeTimers();
  onTestFinished((): void => {
    vi.useRealTimers();
  });
}
