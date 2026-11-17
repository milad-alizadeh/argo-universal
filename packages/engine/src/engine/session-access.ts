import type { Database } from '@repo/db';
import { readAgentAccess } from '../agent-access';
import { createAcpResources, type SessionProcessAccess } from '../agents';
import {
  argoToolsGraceMs,
  SessionTokens,
  sessionLaunchPolicy,
} from '../operations';
import { readTodoList } from '../todo-list';
import type { EngineInput, EngineContext } from './setup.machine';

type AccessServices = Pick<EngineContext, 'acpResources' | 'sessionTokens'>;

export function sessionAccessServices(
  input: Pick<EngineInput, 'acp' | 'home' | 'cliEntry' | 'argoToolsGraceMs'>,
  database: () => Database,
): AccessServices {
  const sessionTokens = tokensFor(input);

  const sessionAccess =
    input.acp?.sessionAccess ?? managedPolicy(input, sessionTokens, database);

  return {
    sessionTokens,
    acpResources: createAcpResources({ ...input.acp, sessionAccess }),
  };
}

const tokensFor = (
  input: Pick<EngineInput, 'argoToolsGraceMs'>,
): SessionTokens =>
  new SessionTokens({
    now: Date.now,
    argoToolsGraceMs: input.argoToolsGraceMs ?? argoToolsGraceMs,
  });

function managedPolicy(
  input: Pick<EngineInput, 'home' | 'cliEntry'>,
  tokens: SessionTokens,
  database: () => Database,
): NonNullable<NonNullable<EngineInput['acp']>['sessionAccess']> {
  const launch = sessionLaunchPolicy(input.home, tokens, input.cliEntry);

  // Both settings are read as the Session opens, so a change reaches the next Session.
  return (sessionId, projectId) => {
    const access = readAgentAccess(database()).enabled
      ? launch(sessionId, projectId)
      : undefined;

    return access && withTodoList(access, readTodoList(database()).enabled);
  };
}

const withTodoList = (
  access: SessionProcessAccess,
  todoList: boolean,
): SessionProcessAccess => ({
  ...access,
  environment: { ...access.environment, todoList },
});
