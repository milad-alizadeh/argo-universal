import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import { writeLog } from '@repo/machine-log';
import type { ActorRefFrom } from 'xstate';
import { type AcpResourceInput } from '../agents';
import type {
  AgentInstallations,
  RegistryActor,
  syncSupervisorMachine,
} from '../agents';
import { blobsFolderIn } from '../blob';
import { PluginRuntime } from '../plugins';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { createEngineAgentLogins } from './agent-logins';
import {
  admitClose,
  connectWebSockets,
  listenOnLoopback,
} from './http-connections';
import { createRequestGuard } from './request-guard';
import { createRequestListener } from './request-listener';
import { type AppRouter, createAppRouter } from './router';
import { createAppRouterDeps } from './router-deps';

export interface HttpServerOptions {
  home: string;
  registry: RegistryActor;
  installations?: AgentInstallations;
  createId: () => string;
  port: number;
  version: string;
  firstPartyPluginsDirectory?: string;
  startedAt: string;
  database: Database;
  sessions: OpenSessionsActorRef;
  databaseWriter: WriterActorRef;
  syncSupervisor: ActorRefFrom<typeof syncSupervisorMachine>;
  commandAdmission?: AbortController;
  acp?: AcpResourceInput;
  loginTimeoutMs?: number;
  loginCleanupTimeoutMs?: number;
}

export interface HttpServer {
  createCaller: (
    options?: Parameters<AppRouter['createCaller']>[1],
  ) => ReturnType<AppRouter['createCaller']>;
  close: () => Promise<void>;
  closeSetup: () => Promise<void>;
}

type HttpSetup = {
  blobsFolder: string;
  commandAdmission: AbortController;
  agentLogins: ReturnType<typeof createEngineAgentLogins>;
  pluginRuntime: PluginRuntime;
};

// Serves tRPC and blobs on loopback (ADR 0002); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const setup = prepareHttpServer(options);
  const guard = createRequestGuard(options.port);
  const server = createHttpListener(guard, setup.blobsFolder, setup.appRouter);

  await listenWithPlugins(server, options.port, setup.pluginRuntime);

  return connectHttpServer(setup, server, guard);
}

function connectHttpServer(
  setup: HttpSetup & { appRouter: AppRouter },
  server: Server,
  guard: ReturnType<typeof createRequestGuard>,
): HttpServer {
  const closeConnections = connectWebSockets(server, setup.appRouter, guard);

  return {
    close: admitClose(setup.commandAdmission, async () => {
      await Promise.all([closeConnections(), setup.pluginRuntime.close()]);
    }),
    closeSetup: () => setup.agentLogins.shutdown(),
    createCaller: (options) => setup.appRouter.createCaller({}, options),
  };
}

function prepareHttpServer(
  options: HttpServerOptions,
): HttpSetup & { appRouter: AppRouter } {
  const setup = prepareHttpSetup(options);

  return { ...setup, appRouter: createHttpRouter(options, setup) };
}

function prepareHttpSetup(options: HttpServerOptions): HttpSetup {
  return {
    blobsFolder: blobsFolderIn(options.home),
    commandAdmission: options.commandAdmission ?? new AbortController(),
    agentLogins: createEngineAgentLogins(options),
    pluginRuntime: new PluginRuntime((line) =>
      writeLog({ home: options.home, label: 'plugins', line }),
    ),
  };
}

function createHttpRouter(
  options: HttpServerOptions,
  setup: HttpSetup,
): AppRouter {
  return createAppRouter(
    createAppRouterDeps({
      ...options,
      blobsFolder: setup.blobsFolder,
      sessionCommandSignal: setup.commandAdmission.signal,
      agentLogins: setup.agentLogins,
      pluginRuntime: setup.pluginRuntime,
    }),
  );
}

async function listenWithPlugins(
  server: Server,
  port: number,
  plugins: PluginRuntime,
): Promise<void> {
  try {
    await listenOnLoopback(server, port);
  } catch (error) {
    await plugins.close();
    throw error;
  }
}

function createHttpListener(
  guard: ReturnType<typeof createRequestGuard>,
  blobsFolder: string,
  router: AppRouter,
): Server {
  return createServer(createRequestListener({ guard, blobsFolder, router }));
}
