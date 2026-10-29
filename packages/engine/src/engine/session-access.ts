import type { Database } from '@repo/db';
import { readAgentAccess } from '../agent-access';
import { createAcpResources } from '../agents';
import { SessionTokens, sessionLaunchPolicy } from '../operations';
import type { EngineInput, EngineContext } from './setup.machine';

type AccessServices = Pick<EngineContext, 'acpResources' | 'sessionTokens'>;

export function sessionAccessServices(
  input: Pick<EngineInput, 'acp' | 'home' | 'cliEntry'>,
  database: () => Database,
): AccessServices {
  const sessionTokens = new SessionTokens();

  const sessionAccess =
    input.acp?.sessionAccess ?? managedPolicy(input, sessionTokens, database);

  return {
    sessionTokens,
    acpResources: createAcpResources({ ...input.acp, sessionAccess }),
  };
}

function managedPolicy(
  input: Pick<EngineInput, 'home' | 'cliEntry'>,
  tokens: SessionTokens,
  database: () => Database,
): NonNullable<NonNullable<EngineInput['acp']>['sessionAccess']> {
  const launch = sessionLaunchPolicy(input.home, tokens, input.cliEntry);

  return (sessionId, projectId) =>
    readAgentAccess(database()).enabled
      ? launch(sessionId, projectId)
      : undefined;
}
