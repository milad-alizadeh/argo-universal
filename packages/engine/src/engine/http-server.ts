import { createServer, type Server } from 'node:http';
import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import { type AcpResourceInput } from '../agents';
import type {
  AgentInstallations,
  RegistryActor,
  syncSupervisorMachine,
} from '../agents';
import { blobsFolderIn } from '../blob';
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
};

// Serves tRPC and blobs on loopback (ADR 0002); resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const { blobsFolder, commandAdmission, agentLogins, appRouter } =
    prepareHttpServer(options);

  const guard = createRequestGuard(options.port);
  const server = createHttpListener(guard, blobsFolder, appRouter);
  await listenOnLoopback(server, options.port);
  const closeConnections = connectWebSockets(server, appRouter, guard);

  return {
    close: admitClose(commandAdmission, closeConnections),
    closeSetup: () => agentLogins.shutdown(),
    createCaller: (callerOptions) => appRouter.createCaller({}, callerOptions),
  };
}

function prepareHttpServer(
  options: HttpServerOptions,
): HttpSetup & { appRouter: AppRouter } {
  const blobsFolder = blobsFolderIn(options.home);
  const commandAdmission = options.commandAdmission ?? new AbortController();
  const agentLogins = createEngineAgentLogins(options);

  const appRouter = createHttpRouter(options, {
    blobsFolder,
    commandAdmission,
    agentLogins,
  });

  return { blobsFolder, commandAdmission, agentLogins, appRouter };
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
    }),
  );
}

function createHttpListener(
  guard: ReturnType<typeof createRequestGuard>,
  blobsFolder: string,
  router: AppRouter,
): Server {
  return createServer(createRequestListener({ guard, blobsFolder, router }));
}
