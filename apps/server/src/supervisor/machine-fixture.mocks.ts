import { afterEach, beforeEach, expect, vi } from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  fromCallback,
  type CallbackActorLogic,
  type EventObject,
} from 'xstate';
import type { EngineCommand } from './engine-message';
import { supervisorMachine, type SupervisorInput } from './machine';

export const supervisorStartedAt = '2026-10-03T00:00:00.000Z';

export const readyEngineEvent = 'engine.ready';

export const engineExitedEvent = 'engine.exit';

export const stopServerEvent = 'server.stop';

export const heartbeatEngineEvent = 'engine.heartbeat';

export const engineStoppedEvent = 'engine.exited';

export const engineUnresolvedEvent = 'engine.unresolved';

interface MockEngine {
  send: (event: AnyEventObject) => void;
  exit: () => void;
  unresolved: () => void;
  askedToStop: boolean;
  stopped: boolean;
}

export let engines: MockEngine[];

export let supervisor: Actor<typeof supervisorMachine>;

// An Engine that exits when asked, unless the test drives `engine.exited` itself.
export const createMockEngine = (options: {
  exitsWhenAsked: boolean;
}): CallbackActorLogic<EngineCommand, { watch: boolean }, EventObject> =>
  fromCallback<EngineCommand, { watch: boolean }>(
    ({ sendBack, receive }): (() => void) => {
      const engine = mockEngine(sendBack);

      engines.push(engine);
      receive((): void => {
        engine.askedToStop = true;

        if (options.exitsWhenAsked) engine.exit();
      });

      return () => markStopped(engine);
    },
  );

const markStopped = (engine: MockEngine): void => {
  engine.stopped = true;
};

const mockEngine = (sendBack: MockEngine['send']): MockEngine => ({
  send: sendBack,
  exit: (): void => sendBack({ type: engineStoppedEvent }),
  unresolved: (): void => sendBack({ type: engineUnresolvedEvent }),
  askedToStop: false,
  stopped: false,
});

export const latestEngine = (): MockEngine =>
  engines.at(-1) ?? expect.unreachable('No engine was started');

export const liveEngines = (): number =>
  engines.filter((engine): boolean => !engine.stopped).length;

beforeEach((): void => {
  vi.useFakeTimers();
  engines = [];
});

afterEach((): void => {
  supervisor?.stop();
  vi.useRealTimers();
});

export function startSupervisorActor(
  machine: typeof supervisorMachine,
  input: SupervisorInput,
): void {
  supervisor = createActor(machine, { input }).start();
}
