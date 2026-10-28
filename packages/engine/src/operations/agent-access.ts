import { project } from '@repo/db/schema';
import {
  installAgentInstructions,
  readAgentAccess,
  setAgentAccess,
} from '../agent-access';
import type { OperationImplementations, OperationsDeps } from './operations';

type AgentAccessImplementations = Pick<
  OperationImplementations,
  'agent.getAccess' | 'agent.setAccess' | 'agent.installInstructions'
>;

export function createAgentAccessOperations(
  deps: OperationsDeps,
): AgentAccessImplementations {
  return {
    'agent.installInstructions': () =>
      installAgentInstructions(installationInput(deps)),
    'agent.getAccess': async () => readAgentAccess(deps.database),
    'agent.setAccess': ({ enabled }) =>
      setAgentAccess(deps.database, deps.databaseWriter, enabled),
  };
}

function installationInput(
  deps: OperationsDeps,
): Parameters<typeof installAgentInstructions>[0] {
  return {
    userHome: deps.userHome,
    projectPaths: deps.database
      .select({ path: project.path })
      .from(project)
      .all()
      .map(({ path }) => path),
  };
}
