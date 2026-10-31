import { createImplementations } from './implementations';
import type { OperationsDeps } from './operations';
import { OperationRunner } from './runner';
import { PromptChains, SessionScope } from './session-scope';

// Every caller's one runner, reading Sessions through the Session directory.
export function createRunner(deps: OperationsDeps): OperationRunner {
  const { directory } = deps.sessions;
  // One set of chains for every caller: a Session's Prompt lengthens one, the user's clears it.
  const chains = new PromptChains();

  return new OperationRunner(createImplementations(deps), {
    directory,
    chains,
    scope: new SessionScope({ directory, createId: deps.createId, chains }),
  });
}
