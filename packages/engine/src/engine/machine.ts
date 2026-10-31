import { type Database } from '@repo/db';
import { assign } from 'xstate';
import { openSessionsId } from '../sessions';
import { databaseWriterId } from '../storage';
import type { OpenDatabaseInput } from './engine-database';
import { type HttpServer } from './http-server';
import type { EngineMessage } from './ipc';
import type { KeepAwakeInput } from './keep-awake';
import {
  recoveryInput,
  writerInput,
  sessionsInput,
  serverInput,
  cleanupInput,
} from './lifecycle-inputs';
import { registryInput } from './registry-input';
import {
  engineSetup,
  openDatabaseOf,
  createEngineContext,
  stoppingLog,
  type EngineContext,
  type EngineOutput,
  type EngineLogParameters,
  type CloseHttpServerInput,
} from './setup.machine';

const finishingEngineTarget = '#engine.finishing';

const closingAgentsTarget = 'closingAgents';

export type { EngineInput } from './setup.machine';

export const engineMachine = engineSetup.createMachine({
  id: 'engine',
  context: ({ input, self }): EngineContext =>
    createEngineContext(input, () =>
      openDatabaseOf(self.getSnapshot().context),
    ),
  invoke: { id: 'processSignals', src: 'processSignals' },
  initial: 'openingDatabase',
  // `live` and `live.stopping` override this.
  on: {
    'engine.stop': {
      target: '.stopped',
      actions: { type: 'log', params: stoppingLog },
    },
  },
  states: {
    openingDatabase: {
      invoke: {
        id: 'openDatabase',
        src: 'openDatabase',
        input: ({ context }): OpenDatabaseInput => ({ home: context.home }),
        onDone: {
          target: 'recovering',
          actions: assign({ database: ({ event }): Database => event.output }),
        },
        onError: {
          target: 'failed',
          actions: assign({
            failure: ({ event }): string =>
              `could not open the database: ${String(event.error)}`,
          }),
        },
      },
    },
    recovering: {
      invoke: {
        id: 'recoverAfterRestart',
        src: 'recoverAfterRestart',
        input: recoveryInput,
        onDone: { target: 'live' },
        onError: {
          target: 'failed',
          actions: assign({
            failure: ({ event }): string =>
              `could not recover after restart: ${String(event.error)}`,
          }),
        },
      },
    },
    live: {
      invoke: [
        {
          id: 'databaseWriter',
          systemId: databaseWriterId,
          src: 'databaseWriter',
          input: writerInput,
        },
        {
          id: 'registry',
          systemId: 'registry',
          src: 'registry',
          input: registryInput,
        },
        {
          id: 'sessions',
          systemId: openSessionsId,
          src: 'sessions',
          input: sessionsInput,
        },
        {
          id: 'caffeinate',
          src: 'caffeinate',
          input: ({ context }): KeepAwakeInput => context,
        },
      ],
      initial: 'listening',
      on: {
        'engine.stop': {
          target: '.stopping',
          actions: { type: 'log', params: stoppingLog },
        },
      },
      states: {
        listening: {
          invoke: {
            id: 'startHttpServer',
            src: 'startHttpServer',
            input: serverInput,
            onDone: {
              target: 'running',
              actions: [
                assign({ server: ({ event }): HttpServer => event.output }),
                {
                  type: 'log',
                  params: ({ event }): EngineLogParameters => ({
                    line: `listening on ${event.output.listeningOn()}`,
                  }),
                },
                {
                  type: 'sendToSupervisor',
                  params: ({
                    context,
                  }): Extract<EngineMessage, { type: 'ready' }> => ({
                    type: 'ready',
                    port: context.port,
                  }),
                },
              ],
            },
            onError: {
              target: '#engine.failed',
              actions: assign({
                failure: ({ event }): string =>
                  `could not listen: ${String(event.error)}`,
              }),
            },
          },
        },
        // The Supervisor restarts an Engine that misses its heartbeat for 5 seconds.
        running: {
          after: {
            heartbeatInterval: {
              target: 'running',
              reenter: true,
              actions: {
                type: 'sendToSupervisor',
                params: { type: 'heartbeat' },
              },
            },
          },
        },
        stopping: {
          entry: ['closeCommandAdmission', 'stopRegistry'],
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
                input: cleanupInput,
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
        },
      },
    },
    finishing: {
      always: [
        { guard: 'hasFailure', target: 'failed' },
        { target: 'stopped' },
      ],
    },
    stopped: { type: 'final', entry: [{ type: 'closeDatabase' }] },
    failed: {
      type: 'final',
      entry: [
        { type: 'closeDatabase' },
        {
          type: 'log',
          params: ({ context }): EngineLogParameters => ({
            line: context.failure ?? 'failed',
          }),
        },
      ],
    },
  },
  output: ({ context }): EngineOutput => ({
    exitCode: context.failure === null ? 0 : 1,
  }),
});
