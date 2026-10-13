import { expect } from 'vitest';
import { type EngineSnapshot } from './engine-lifecycle-actors';
import { record } from './engine-lifecycle-record';
export const expectModelState = (expected: EngineSnapshot): void => {
  const actual = record.engine.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.context.database).toBe(
    expected.context.database === null ? null : record.mockDatabase,
  );
  expect(actual.context.server).toBe(expected.context.server);
  expect(actual.context.failure).toBe(expected.context.failure);
};
// Final states close the database they opened, stop listening for signals, and exit with a code.
export const expectExit = (
  snapshot: EngineSnapshot,
  exitCode: number,
): void => {
  expectModelState(snapshot);
  expect(record.engine.getSnapshot().output).toEqual({ exitCode });
  expect(record.databaseCloses).toBe(
    snapshot.context.database === null ? 0 : 1,
  );
  expect(record.processSignals.live).toBe(false);
};
