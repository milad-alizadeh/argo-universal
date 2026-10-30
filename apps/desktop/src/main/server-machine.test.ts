import { pollIntervalMs, startLimitMs, stopLimitMs } from '@repo/process';
import { describeModel, modelTest } from '@repo/vitest/model-test';
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
import { input, machine, startServerMachine } from './server-machine.mocks';

const model = modelTest(
  machine,
  {
    input,
    fixtures,
    vertex,
    permits: permitsStaleAddress,
    walks: [
      { name: 'shortest path', search: 'shortest' },
      {
        name: 'simple path',
        search: 'simple',
        arrivals: false,
        permits: ignoresCounts,
      },
    ],
  },
  {
    start: startServerMachine,
    delays: {
      pollDelay: pollIntervalMs,
      startLimit: startLimitMs,
      stopLimit: stopLimitMs,
    },
    executors,
    always,
    states,
    label,
  },
);

describe('server connection model', (): void => {
  describeModel(model);

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });
});
