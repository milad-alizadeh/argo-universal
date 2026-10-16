import { waitFor } from 'xstate';
import type { AcpResources } from '../agents';
import type { OpenSessionsActorRef } from '../sessions';

export type CloseAcpResourcesInput = {
  resources: Pick<AcpResources, 'shutdown'>;
  sessions: OpenSessionsActorRef | undefined;
};

export async function closeAgentResources(
  input: CloseAcpResourcesInput,
): Promise<void> {
  await input.resources.shutdown();

  if (!input.sessions) return;
  await waitFor(input.sessions, (snapshot) => snapshot.status !== 'active', {
    timeout: Infinity,
  });
}
