import type { ChangeActions, UnreadChange } from '#features/sessions';
import { discoveryOf, unreadOf } from './change-outcomes';
import { referenceOfChange } from './change-reference';
import type { OperationRunner } from './page-calls-ports';
import type { ChangesContext } from './use-session-pull-requests';

// The Plugin that supplies PR-backed Changes, and so the one whose Operations connect a Session to them.
const pluginId = 'github';

interface Association {
  operation: 'attach' | 'detach' | 'discover' | 'refresh';
  scope: ChangesContext;
  reference?: string;
}

type Answer = Awaited<ReturnType<OperationRunner['run']>>;

const argsOf = (reference: string | undefined): Record<string, string> =>
  reference === undefined ? {} : { reference };

// A refusal is said by the runner's failure toast, never thrown; the Operation then answered nothing.
function refused(runner: OperationRunner, cause: unknown): undefined {
  runner.failed(cause instanceof Error ? cause : new Error(String(cause)));

  return undefined;
}

// What the Operation answered, or nothing when it refused.
async function run(
  runner: OperationRunner,
  { operation, scope, reference }: Association,
): Promise<Answer | undefined> {
  const args = argsOf(reference);

  try {
    return await runner.run({ pluginId, operation, args, ...scope });
  } catch (cause) {
    return refused(runner, cause);
  }
}

// The attached pull requests that were never read, held by the page, and told of each new reading.
export interface UnreadReading {
  unread: readonly UnreadChange[];
  set: (unread: UnreadChange[]) => void;
}

const nothingUnread: UnreadReading = { unread: [], set: () => {} };

type Runs = Pick<ChangeActions, 'attach' | 'detach' | 'discover'>;

const runsOf = (runner: OperationRunner, scope: ChangesContext): Runs => ({
  attach: async (reference) =>
    !!(await run(runner, { operation: 'attach', scope, reference })),
  detach: async (change) =>
    !!(await run(runner, {
      operation: 'detach',
      scope,
      reference: referenceOfChange(change),
    })),
  discover: async () => {
    const answer = await run(runner, { operation: 'discover', scope });

    return answer && discoveryOf(answer.result);
  },
});

/*
 * The Operations behind the Session's association controls. They are the Agent's own `github.attach`, `github.detach`,
 * `github.discover` and `github.refresh`, so a person and an Agent change the same associations, within the Session's
 * Project.
 */
export const associationsOf = (
  runner: OperationRunner,
  scope: ChangesContext,
  reading: UnreadReading = nothingUnread,
): ChangeActions => ({
  ...runsOf(runner, scope),
  refresh: async () => {
    const answer = await run(runner, { operation: 'refresh', scope });

    if (answer) reading.set(unreadOf(answer.result));
  },
  unread: reading.unread,
});
