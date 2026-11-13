import type { ChangeActions } from '#features/sessions';
import { referenceOfChange } from './change-reference';
import type { OperationRunner } from './page-calls-ports';
import type { ChangesContext } from './use-session-pull-requests';

// The Plugin that supplies PR-backed Changes, and so the one whose Operations connect a Session to them.
export const changesPluginId = 'github';

type Association = {
  operation: 'attach' | 'detach';
  scope: ChangesContext;
  reference: string;
};

// Whether the Operation ran; a refusal is said by the runner's failure toast, never thrown.
async function run(
  runner: OperationRunner,
  { operation, scope, reference }: Association,
): Promise<boolean> {
  try {
    await runner.run({
      pluginId: changesPluginId,
      operation,
      args: { reference },
      ...scope,
    });

    return true;
  } catch (cause) {
    runner.failed(cause instanceof Error ? cause : new Error(String(cause)));

    return false;
  }
}

/*
 * The Operations behind the Session's association controls. They are the Agent's own `github.attach` and
 * `github.detach`, so a person and an Agent change the same associations, within the Session's Project.
 */
export const associationsOf = (
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
