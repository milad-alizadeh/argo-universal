import type { Automations, Fresh } from './pull-automations';

const isFailure = (
  turn: PromiseSettledResult<void>,
): turn is PromiseRejectedResult => turn.status === 'rejected';

/*
 * The Watch for one Project: each automation takes its turn, and one failing does not stop the others. The first
 * failure is thrown after all have run.
 */
export async function watchProject(
  automations: Automations,
  fresh: Fresh,
  projectId: string,
): Promise<void> {
  const turns = await Promise.allSettled(
    Object.values(automations).map((automation) =>
      automation.watch(projectId, fresh),
    ),
  );

  const failed = turns.find(isFailure);

  if (failed) throw failed.reason;
}
