import { createImplementations } from './implementations';
import type { OperationsDeps } from './operations';
import { OperationRunner } from './runner';
import { SessionScope } from './session-scope';

// Every caller's one runner, reading Sessions through the Session directory.
export function createRunner(deps: OperationsDeps): OperationRunner {
  const { directory } = deps.sessions;

  return new OperationRunner(createImplementations(deps), {
    directory,
    scope: new SessionScope({ directory, createId: deps.createId }),
  });
}
