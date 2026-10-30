import type { ModelFixture } from '@repo/vitest/model-test';
import type { Vertex } from '@repo/vitest/model-test';
import { beforeEach } from 'vitest';
import type { SnapshotFrom } from 'xstate';
import { supervisorMachine } from './machine';
import {
  createMockEngine,
  supervisorStartedAt,
  readyEngineEvent,
  engineExitedEvent,
  heartbeatEngineEvent,
  engineStoppedEvent,
  engineUnresolvedEvent,
  stopServerEvent,
} from './machine-fixture.mocks';

export let serverAddressWrites: unknown[];

export let serverAddressRemovals: number;

export const machine = supervisorMachine.provide({
  actors: { engine: createMockEngine({ exitsWhenAsked: false }) },
  actions: {
    writeServerAddress: ({ context }): void => {
      serverAddressWrites.push({
        port: context.port,
        version: context.version,
        startedAt: context.startedAt,
      });
    },
    removeServerAddress: (): void => {
      serverAddressRemovals += 1;
    },
  },
});

export type SupervisorSnapshot = SnapshotFrom<typeof machine>;

export const input = {
  now: (): number => 1000,
  home: '/unused',
  version: '1.2.3',
  startedAt: supervisorStartedAt,
  watch: false,
};

// The Supervisor's delayed transitions need no fixture: the model fires them by their delay.
export const fixtures = [
  { type: readyEngineEvent, port: 7337 },
  { type: engineExitedEvent, code: 1 },
  { type: heartbeatEngineEvent },
  { type: engineStoppedEvent },
  { type: engineUnresolvedEvent },
  { type: stopServerEvent },
] satisfies ModelFixture<typeof machine>[];

export type SupervisorEvent = (typeof fixtures)[number];

// Crash count, not crash times.
export const vertex = (snapshot: SupervisorSnapshot): Vertex => ({
  value: snapshot.value,
  port: snapshot.context.port,
  crashes: snapshot.context.crashTimes.length,
});

beforeEach((): void => {
  serverAddressWrites = [];
  serverAddressRemovals = 0;
});
