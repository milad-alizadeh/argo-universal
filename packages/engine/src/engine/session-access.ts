import { createAcpResources } from '../agents';
import { SessionTokens, sessionLaunchPolicy } from '../operations';
import type { EngineInput, EngineContext } from './setup.machine';

type AccessServices = Pick<EngineContext, 'acpResources' | 'sessionTokens'>;

export function sessionAccessServices(
  input: Pick<EngineInput, 'acp' | 'home'>,
): AccessServices {
  const sessionTokens = new SessionTokens();

  const sessionAccess =
    input.acp?.sessionAccess ?? sessionLaunchPolicy(input.home, sessionTokens);

  return {
    sessionTokens,
    acpResources: createAcpResources({ ...input.acp, sessionAccess }),
  };
}
