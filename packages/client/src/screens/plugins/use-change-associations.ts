import type { ChangeActions } from '#features/sessions';
import { referenceOfChange } from './change-reference';
import type { OperationRunner } from './page-calls-ports';
import type { ChangesContext } from './use-session-pull-requests';
import { useOperationRunner } from './use-tree-calls';

// The Plugin that supplies PR-backed Changes, and so the one whose Operations connect a Session to them.
const pluginId = 'github';

type Association = {
  operation: 'attach' | 'detach';
  scope: ChangesContext;
  reference: string;
};

async function run(
  runner: OperationRunner,
  { operation, scope, reference }: Association,
): Promise<void> {
  try {
    await runner.run({ pluginId, operation, args: { reference }, ...scope });
  } catch (cause) {
    runner.failed(cause instanceof Error ? cause : new Error(String(cause)));
  }
}

/*
 * The Operations behind the Session's association controls. They are the Agent's own `github.attach` and
 * `github.detach`, so a person and an Agent change the same associations, within the Session's Project; a refusal is
 * toasted as any Operation's is. None while the Session has not loaded.
 */
export function useChangeAssociations(
  session: ChangesContext | undefined,
): ChangeActions | undefined {
  const runner = useOperationRunner();

  return session && associationsOf(runner, session);
}

const associationsOf = (
  runner: OperationRunner,
  scope: ChangesContext,
): ChangeActions => ({
  attach: (reference) => run(runner, { operation: 'attach', scope, reference }),
  detach: (change) =>
    run(runner, {
      operation: 'detach',
      scope,
      reference: referenceOfChange(change),
    }),
});
