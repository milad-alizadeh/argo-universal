import { expect, it, onTestFinished } from 'vitest';
import { countDatabaseReads, openTestDatabase } from '#mocks/database';
import { tool } from '#mocks/live-header-tool';
import { createLiveHeaderRowsReader } from './live-header-rows';

it('reads no stored rows without an active Turn', (): void => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  const counted = countDatabaseReads(database);
  expect(
    createLiveHeaderRowsReader({ database: counted.database })({
      writer: undefined,
      sessionId: 'session-1',
      turnId: null,
      rows: { 'tool-1': tool },
    }).rows,
  ).toEqual({});
  expect(counted.metrics).toEqual({
    queries: 0,
    rows: 0,
    largestRead: 0,
    sessionReads: 0,
  });
});
