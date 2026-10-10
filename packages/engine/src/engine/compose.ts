import { createActor, type Actor } from 'xstate';
import type { EngineMessage } from './ipc';
import { type EngineInput, engineMachine } from './machine';

// The outside ports: the Agent process launcher (`acp.launchProcess`), the launch resolver, the Registry fetch, the clock and ids.
export type EnginePorts = EngineInput & {
  // Where the Engine reports `ready` and heartbeats; the Supervisor's IPC channel unless replaced.
  report?: (message: EngineMessage) => void;
};

export type EngineActor = Actor<typeof engineMachine>;

// The one Engine composition, for production, the Engine test host and E2E; the caller starts it.
export function composeEngine({ report, ...input }: EnginePorts): EngineActor {
  const machine = report
    ? engineMachine.provide({
        actions: {
          sendToSupervisor: (_, message: EngineMessage): void =>
            report(message),
        },
      })
    : engineMachine;
  return createActor(machine, { input });
}
