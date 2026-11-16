import type {
  ContentBlock,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import { z } from 'zod';
import { supportsOwnedSteering } from '../../vendor';
import type { AcpSessionLease } from '../resources/resource-types';

const capability = z.object({
  steering: z.object({ supported: z.literal(true) }),
});

const outcome = z.object({
  outcome: z.enum(['injected', 'promptRequired', 'failed', 'startedNewTurn']),
});

// These releases keep an idle race with the host and retain ownership of injected output.
export function supportsSteering(initialization: InitializeResponse): boolean {
  return [
    capability.safeParse(initialization._meta).success,
    supportsOwnedSteering(initialization.agentInfo),
  ].every(Boolean);
}

export async function steerAcpSession(
  lease: AcpSessionLease,
  prompt: ContentBlock[],
): Promise<void> {
  if (!lease.steering)
    throw new Error('This Agent does not support active-Turn steering');

  const response = await lease.agent.request<unknown>('_session/steering', {
    sessionId: lease.sessionId,
    prompt,
    _meta: { steering: { idleBehavior: 'promptRequired' } },
  });

  if (outcome.parse(response).outcome !== 'injected')
    throw new Error('The Agent did not accept steering; your Prompt was kept');
}
