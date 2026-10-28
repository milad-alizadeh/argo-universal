import type { Database } from '@repo/db';
import { readAgentAccess } from '../agent-access';
import { createAcpResources } from '../agents';
import { SessionTokens, sessionLaunchPolicy } from '../operations';
import type { EngineInput, EngineContext } from './setup.machine';

type AccessServices = Pick<EngineContext, 'acpResources' | 'sessionTokens'>;

export function sessionAccessServices(
  input: Pick<EngineInput, 'acp' | 'home'>,
  database: () => Database,
): AccessServices {
  const sessionTokens = new SessionTokens();

  const sessionAccess =
    input.acp?.sessionAccess ??
    managedPolicy(input.home, sessionTokens, database);

  return {
    sessionTokens,
    acpResources: createAcpResources({ ...input.acp, sessionAccess }),
  };
}

function managedPolicy(
  home: string,
  tokens: SessionTokens,
  database: () => Database,
): NonNullable<NonNullable<EngineInput['acp']>['sessionAccess']> {
  const launch = sessionLaunchPolicy(home, tokens);

  return (sessionId, projectId) =>
    readAgentAccess(database()).enabled
      ? launch(sessionId, projectId)
      : undefined;
}
