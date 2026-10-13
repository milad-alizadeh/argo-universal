import { assign } from 'xstate';
import { findMachineActor } from '../lib/machine-actor';
import { openSessionsId, openSessionsMachine } from '../sessions';
import {
  engineSetup,
  type CloseHttpServerInput,
  type CloseAcpResourcesInput,
  type EngineLogParameters,
} from './lifecycle-setup-machine';
const finishingEngineTarget = '#engine.finishing';
const closingAgentsTarget = 'closingAgents';
export const stopping = engineSetup.createStateConfig({
  entry: ['closeCommandAdmission', 'stopSync'],
  initial: 'closingHttp',
  on: { 'engine.stop': {} },
  states: {
    closingHttp: {
      invoke: {
        id: 'closeHttpServer',
        src: 'closeHttpServer',
        input: ({ context }): CloseHttpServerInput => ({
          server: context.server,
        }),
        onDone: { target: 'stoppingSessions' },
        onError: {
          target: 'stoppingSessions',
          actions: assign({
            failure: ({ event }): string =>
              `could not close: ${String(event.error)}`,
          }),
        },
      },
      after: {
        httpCloseLimit: {
          target: 'stoppingSessions',
          actions: {
            type: 'log',
            params: {
              line: 'HTTP close limit reached; stopping Sessions',
            },
          },
        },
      },
    },
    stoppingSessions: {
      entry: 'stopSessions',
      on: {
        'xstate.done.actor.sessions': { target: closingAgentsTarget },
        'xstate.error.actor.sessions': {
          target: closingAgentsTarget,
          actions: {
            type: 'log',
            params: ({ event }): EngineLogParameters => ({
              line: `could not stop Sessions: ${String(event.error)}`,
            }),
          },
        },
      },
      after: {
        sessionStopLimit: {
          target: closingAgentsTarget,
          actions: {
            type: 'log',
            params: {
              line: 'Session stop limit reached; closing Agent resources',
            },
          },
        },
      },
    },
    closingAgents: {
      invoke: {
        id: 'closeAcpResources',
        src: 'closeAcpResources',
        input: ({ context, self }): CloseAcpResourcesInput => ({
          resources: context.acpResources,
          server: context.server,
          installations: context.installations,
          sessions: findMachineActor(
            self.system,
            openSessionsId,
            openSessionsMachine,
          ),
        }),
        onDone: { target: 'drainingWriter' },
        onError: {
          target: 'retainingAgentCleanup',
          actions: assign({
            failure: ({ event }): string =>
              `Agent cleanup remains unresolved: ${String(event.error)}`,
          }),
        },
      },
    },
    retainingAgentCleanup: {
      entry: {
        type: 'log',
        params: ({ context }): EngineLogParameters => ({
          line: context.failure ?? 'Agent cleanup remains unresolved',
        }),
      },
    },
    drainingWriter: {
      entry: 'drainWriter',
      on: {
        'xstate.done.actor.databaseWriter': {
          target: finishingEngineTarget,
        },
        'xstate.error.actor.databaseWriter': {
          target: finishingEngineTarget,
          actions: {
            type: 'log',
            params: ({ event }): EngineLogParameters => ({
              line: `could not drain the writer: ${String(event.error)}`,
            }),
          },
        },
      },
      after: {
        writerDrainLimit: {
          target: finishingEngineTarget,
          actions: {
            type: 'log',
            params: {
              line: 'Writer drain limit reached; closing the database',
            },
          },
        },
      },
    },
  },
});
