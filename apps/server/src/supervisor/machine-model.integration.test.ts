import { modelTest } from '@repo/vitest/model-test';
import { describe, expect, it } from 'vitest';
import { startSupervisorActor, supervisor } from './machine-fixture.mocks';
import { executors, states } from './machine-model-checks.mocks';
import { fixtures, input, machine, vertex } from './machine-model.mocks';

const model = modelTest(machine, {
  input,
  fixtures,
  vertex,
  limit: 10_000,
  running: () => supervisor,
  start: (): void => startSupervisorActor(machine, input),
  executors,
  states,
  walks: [
    { name: 'shortest path', search: 'shortest' },
    {
      name: 'simple path, up to two crashes',
      search: 'simple',
      stopWhen: (snapshot): boolean => snapshot.context.crashTimes.length >= 2,
    },
  ],
});

describe('supervisor model', (): void => {
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
