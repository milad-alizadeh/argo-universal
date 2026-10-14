import { waitFor } from 'xstate';
import type { AcpResources } from '../agents';
import type { AgentInstallations } from '../agents';
import type { OpenSessionsActorRef } from '../sessions';
import type { HttpServer } from './http-server';

export type CloseAcpResourcesInput = {
  resources: Pick<AcpResources, 'shutdown'>;
  server?: Pick<HttpServer, 'closeSetup'> | null;
  installations: Pick<AgentInstallations, 'shutdown' | 'tools'>;
  sessions: OpenSessionsActorRef | undefined;
};

export async function closeAgentResources(
  input: CloseAcpResourcesInput,
): Promise<void> {
  await Promise.all([
    input.server?.closeSetup(),
    input.installations.shutdown(),
    // Homebrew installing a missing tool stops with the Agent installs.
    input.installations.tools.shutdown(),
  ]);
  await input.resources.shutdown();
  if (!input.sessions) return;
  await waitFor(input.sessions, (snapshot) => snapshot.status !== 'active', {
    timeout: Infinity,
  });
}
