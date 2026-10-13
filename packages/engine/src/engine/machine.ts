import type { Database } from '@repo/db';
import { writeLog } from '@repo/machine-log';
import { assign, type InputFrom } from 'xstate';
import { createAcpResources } from '../acp';
import { AgentInstallations, type SyncSupervisorInput } from '../agents';
import { blobsFolderIn } from '../blob';
import { type OpenSessionsInput, openSessionsId } from '../sessions';
import { databaseWriterId, writerMachine } from '../storage';
import type { HttpServer, HttpServerOptions } from './http-server';
import type { EngineMessage } from './ipc';
import {
  engineSetup,
  openDatabaseOf,
  requireDatabaseWriter,
  requireOpenSessions,
  requireSyncSupervisor,
  type EngineContext,
  type EngineLogParameters,
  type EngineOutput,
  type OpenDatabaseInput,
  type RecoveryInput,
} from './setup.machine';
import { stopping } from './stopping';
export type { EngineInput } from './setup.machine';
export const engineMachine = engineSetup.createMachine({
  id: 'engine',
  context: ({ input }): EngineContext => ({
    ...input,
    database: null,
    server: null,
    failure: null,
    acpResources: createAcpResources(input.acp),
    installations: new AgentInstallations(input.home, input.installationPorts),
    commandAdmission: new AbortController(),
  }),
  invoke: { id: 'processSignals', src: 'processSignals' },
  initial: 'openingDatabase',
  // `live` and `live.stopping` override this.
  on: {
    'engine.stop': {
      target: '.stopped',
      actions: {
        type: 'log',
        params: ({ event }): EngineLogParameters => ({
          line: `stopping: ${event.reason}`,
        }),
      },
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
        input: ({ context }): RecoveryInput => {
          return {
            database: openDatabaseOf(context),
            home: context.home,
            blobsFolder: blobsFolderIn(context.home),
          };
        },
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
          input: ({ context }): InputFrom<typeof writerMachine> => ({
            database: openDatabaseOf(context),
            now: context.now,
            log: (line: string): void =>
              writeLog({ home: context.home, label: 'engine', line }),
            blobsFolder: blobsFolderIn(context.home),
          }),
        },
        {
          id: 'syncSupervisor',
          systemId: 'syncSupervisor',
          src: 'syncSupervisor',
          input: ({ context, self }): SyncSupervisorInput => ({
            database: openDatabaseOf(context),
            writer: requireDatabaseWriter(self.system),
            fetchAgents: context.fetchAgents,
            now: context.now,
          }),
        },
        {
          id: 'sessions',
          systemId: openSessionsId,
          src: 'sessions',
          input: ({ context }): OpenSessionsInput => ({
            database: openDatabaseOf(context),
            runtimeDirectory: context.home,
            adapters: context.adapters,
            now: context.now,
            createId: context.createId,
            acpResources: context.acpResources,
            resolveAgentLaunch: context.resolveAgentLaunch,
            isAgentSetupBusy: (agentId) =>
              context.installations.isBusy(agentId),
          }),
        },
      ],
      initial: 'listening',
      on: {
        'engine.stop': {
          target: '.stopping',
          actions: {
            type: 'log',
            params: ({ event }): EngineLogParameters => ({
              line: `stopping: ${event.reason}`,
            }),
          },
        },
      },
      states: {
        listening: {
          invoke: {
            id: 'startHttpServer',
            src: 'startHttpServer',
            input: ({ context, self }): HttpServerOptions => ({
              createId: context.createId,
              installations: context.installations,
              sessions: requireOpenSessions(self.system),
              databaseWriter: requireDatabaseWriter(self.system),
              syncSupervisor: requireSyncSupervisor(self.system),
              commandAdmission: context.commandAdmission,
              acp: context.acp,
              loginTimeoutMs: context.loginTimeoutMs,
              loginCleanupTimeoutMs: context.loginCleanupTimeoutMs,
              ...serverAddress(context),
              database: openDatabaseOf(context),
            }),
            onDone: {
              target: 'running',
              actions: [
                assign({ server: ({ event }): HttpServer => event.output }),
                {
                  type: 'log',
                  params: ({ context }): EngineLogParameters => ({
                    line: `listening on 127.0.0.1:${context.port}`,
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
        stopping,
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

function serverAddress(
  context: EngineContext,
): Pick<HttpServerOptions, 'home' | 'port' | 'version' | 'startedAt'> {
  const { home, port, version, startedAt } = context;
  return { home, port, version, startedAt };
}
