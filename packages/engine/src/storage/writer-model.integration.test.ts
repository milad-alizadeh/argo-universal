import { modelTest } from '@repo/vitest/model-test';
import { describe, expect, it } from 'vitest';
import {
  input,
  machine,
  mockDatabase,
  startWriterActor,
  writer,
} from './writer-fixture.mocks';
import { executors, expectRefusals, states } from './writer-model-checks.mocks';
import {
  budgetFixtures,
  budgetVertex,
  fixtures,
  label,
  vertex,
} from './writer-model.mocks';

const model = modelTest(machine, {
  input,
  fixtures,
  vertex,
  label,
  limit: 1000,
  running: writer,
  start: (): void => startWriterActor(),
  executors,
  always: expectRefusals,
  states,
  walks: [
    {
      name: 'shortest path',
      search: 'shortest',
      fixtures: budgetFixtures,
      vertex: budgetVertex,
    },
    { name: 'simple path', search: 'simple' },
  ],
});

// The paths are generated; no test opens this database.
mockDatabase.$client.close();

describe('database writer model', (): void => {
  describe.each(model.suites)('$name', ({ cases }): void => {
    it.each(cases)('$title', async ({ run }): Promise<void> => {
      expect.hasAssertions();
      await run();
    });
  });

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });
});
