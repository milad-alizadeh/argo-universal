import { storedOperationGrants } from '../agent-access';
import { createImplementations } from './implementations';
import { OperationArchive } from './operation-archive';
import type { OperationsDeps } from './operations';
import { OperationRunner } from './runner';
import { createRunStarts } from './runs';
import { PromptChains, SessionScope } from './session-scope';

// Every caller's one runner, reading Sessions through the Session directory.
export function createRunner(deps: OperationsDeps): OperationRunner {
  const { directory } = deps.sessions;
  // One set of chains for every caller: a Session's Prompt lengthens one, the user's clears it.
  const chains = new PromptChains();

  return new OperationRunner(createImplementations(deps), {
    directory,
    appRunStarts: createRunStarts(deps, true),
    chains,
    screenSight: deps.screenSight,
    requireClearTarget: (sessionId) =>
      deps.sessions.requireClearTarget(sessionId),
    archive: new OperationArchive(deps.sessions.archives),
    scope: new SessionScope({
      directory,
      createId: deps.createId,
      chains,
      grants: storedOperationGrants(deps.database, deps.databaseWriter),
      canReadShell: (callerId, targetId) => {
        const caller = deps.runs.sessions.checkout(callerId);
        const target = deps.runs.sessions.checkout(targetId);

        return (
          caller.projectId === target.projectId &&
          caller.checkoutPath === target.checkoutPath
        );
      },
    }),
  });
}
