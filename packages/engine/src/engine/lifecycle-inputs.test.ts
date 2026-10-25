import { expect, it } from 'vitest';
import { createActor, fromPromise } from 'xstate';
import { requireDatabaseWriter } from './setup.machine';

it('fails loudly when no database writer is running for the Sessions', (): void => {
  const { system } = createActor(fromPromise(() => Promise.resolve()));

  expect(() => requireDatabaseWriter(system)).toThrow(
    'Database Writer is not running',
  );
});
