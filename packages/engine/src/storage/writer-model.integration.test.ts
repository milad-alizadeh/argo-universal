import { describeModel, modelTest } from '@repo/vitest/model-test';
import { describe, expect, it } from 'vitest';
import {
  input,
  machine,
  mockDatabase,
  startWriterActor,
  writeRetryDelayMs,
} from './writer-fixture.mocks';
import { executors, expectRefusals, states } from './writer-model-checks.mocks';
import {
  budgetFixtures,
  budgetVertex,
  fixtures,
  label,
  vertex,
} from './writer-model.mocks';

const model = modelTest(
  machine,
  {
    input,
    fixtures,
    vertex,
    limit: 1000,
    walks: [
      {
        name: 'shortest path',
        search: 'shortest',
        fixtures: budgetFixtures,
        vertex: budgetVertex,
      },
      { name: 'simple path', search: 'simple' },
    ],
  },
  {
    start: startWriterActor,
    delays: { writeRetryDelay: writeRetryDelayMs },
    executors,
    always: expectRefusals,
    states,
    label,
  },
);

// The paths are generated; no test opens this database.
mockDatabase.$client.close();

describe('database writer model', (): void => {
  describeModel(model);

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });
});
