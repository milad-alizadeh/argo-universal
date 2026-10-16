import { randomUUID } from 'node:crypto';
import { createActor } from 'xstate';
import { createAcpResources } from '../src/agents';
import { openSessionsMachine } from '../src/sessions';
import { openTestDatabase } from './database';
import { unlaunchedInstalledAgents } from './installed-agents';

type ListInput = {
  sessions: ReturnType<typeof createActor<typeof openSessionsMachine>>;
  writer: undefined;
  readRows: () => never[];
  sessionIdsForChanges: () => never[];
  relatedSessionIds: (ids: readonly string[]) => string[];
};

type ListModel = { input: ListInput; remove: () => void };

export function openSessionListModel(): ListModel {
  const runtime = openTestDatabase();

  return {
    input: listInput(runtime),
    remove: runtime.remove,
  };
}

function listInput(runtime: ReturnType<typeof openTestDatabase>): ListInput {
  return {
    sessions: modelSessions(runtime),
    writer: undefined,
    readRows: (): never[] => [],
    sessionIdsForChanges: (): never[] => [],
    relatedSessionIds: (ids): string[] => [...ids],
  };
}

function modelSessions(
  runtime: ReturnType<typeof openTestDatabase>,
): ListInput['sessions'] {
  return createActor(openSessionsMachine, {
    input: {
      now: (): number => Date.now(),
      createId: randomUUID,
      database: runtime.database,
      runtimeDirectory: runtime.directory,
      acpResources: createAcpResources(),
      installedAgents: unlaunchedInstalledAgents(
        runtime.database,
        runtime.directory,
      ),
    },
  });
}
