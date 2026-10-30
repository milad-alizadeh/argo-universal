import { modelTest } from '@repo/vitest/model-test';
import { describe, expect, it } from 'vitest';
import { fixtures } from './server-machine-model-events.mocks';
import { executors } from './server-machine-model-executors.mocks';
import {
  ignoresCounts,
  label,
  permitsStaleAddress,
  vertex,
} from './server-machine-model-graph.mocks';
import { always, states } from './server-machine-model-states.mocks';
import {
  input,
  machine,
  server,
  startServerMachine,
} from './server-machine.mocks';

const model = modelTest(machine, {
  input,
  fixtures,
  vertex,
  permits: permitsStaleAddress,
  label,
  running: () => server,
  start: (): void => {
    startServerMachine();
  },
  executors,
  always,
  states,
  walks: [
    { name: 'shortest path', search: 'shortest' },
    {
      name: 'simple path',
      search: 'simple',
      arrivals: false,
      permits: ignoresCounts,
    },
  ],
});

describe('server connection model', (): void => {
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
