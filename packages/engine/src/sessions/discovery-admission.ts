import { stat } from 'node:fs/promises';
import type { SessionDiscoveryInput } from '@repo/contracts';
import { readProjectPath } from '../projects';
import { admitsNewSession } from './agent-admission';
import type { OpenSessionsInput } from './open-sessions-machine';

export async function validateDiscoveryDestination(
  context: OpenSessionsInput,
  input: SessionDiscoveryInput,
): Promise<void> {
  const path = validateDiscoveryIdentity(context, input);

  if (!(await stat(path)).isDirectory())
    throw new Error('Project is unavailable');
}

export function validateDiscoveryIdentity(
  context: OpenSessionsInput,
  input: SessionDiscoveryInput,
): string {
  if (!admitsNewSession(context, input.agent))
    throw new Error('Agent is unavailable');

  return readProjectPath(context.database, input.projectId);
}
