import { describeModel, modelTest } from '@repo/vitest/model-test';
import { describe, expect, it } from 'vitest';
import { startSupervisorActor } from './machine-fixture.mocks';
import { delays, executors, states } from './machine-model-checks.mocks';
import { fixtures, input, machine, vertex } from './machine-model.mocks';

const model = modelTest(
  machine,
  {
    input,
    fixtures,
    vertex,
    limit: 10_000,
    walks: [
      { name: 'shortest path', search: 'shortest' },
      {
        name: 'simple path, up to two crashes',
        search: 'simple',
        stopWhen: (snapshot): boolean =>
          snapshot.context.crashTimes.length >= 2,
      },
    ],
  },
  {
    start: (startInput) => startSupervisorActor(machine, startInput),
    delays,
    executors,
    states,
  },
);

describe('supervisor model', (): void => {
  describeModel(model);

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });
});
