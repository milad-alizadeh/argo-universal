import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import type { AcpResourceInput } from '../acp';
import type { AgentInstallations, syncSupervisorMachine } from '../agents';
import { blobsFolderIn } from '../blob';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { createEngineAgentLogins } from './agent-logins';
import { startHttpTransport } from './http-transport';
import { type AppRouter, createAppRouter } from './router';
import { createAppRouterDeps } from './router-deps';

export interface HttpServerOptions {
  home: string;
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

function createServerRouter(
  options: HttpServerOptions,
  commandAdmission: AbortController,
  agentLogins: ReturnType<typeof createEngineAgentLogins>,
): AppRouter {
  return createAppRouter(
    createAppRouterDeps({
      ...options,
      blobsFolder: blobsFolderIn(options.home),
      sessionCommandSignal: commandAdmission.signal,
      agentLogins,
    }),
  );
}

function serverInterface(
  router: AppRouter,
  logins: ReturnType<typeof createEngineAgentLogins>,
  close: () => Promise<void>,
): HttpServer {
  return {
    close,
    closeSetup: () => logins.shutdown(),
    createCaller: (callerOptions) => router.createCaller({}, callerOptions),
  };
}

const closeWithAdmission =
  (
    admission: AbortController,
    close: HttpServer['close'],
  ): HttpServer['close'] =>
  (): Promise<void> => {
    admission.abort();
    return close();
  };

// Serves one tRPC router and blobs on loopback; resolves once the port is bound.
export async function startHttpServer(
  options: HttpServerOptions,
): Promise<HttpServer> {
  const admission = options.commandAdmission ?? new AbortController();
  const logins = createEngineAgentLogins(options);
  const router = createServerRouter(options, admission, logins);
  const close = await startHttpTransport({
    port: options.port,
    blobsFolder: blobsFolderIn(options.home),
    router,
  });
  return serverInterface(router, logins, closeWithAdmission(admission, close));
}
