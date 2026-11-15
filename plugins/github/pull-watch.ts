import type { Argo } from '@argo/plugin-kit';
import { autoArchive } from './pull-archive';
import { autoFix } from './pull-fix';
import type { ChangesSource } from './pull-link-reads';

const isFailure = (
  turn: PromiseSettledResult<void>,
): turn is PromiseRejectedResult => turn.status === 'rejected';

/*
 * The Watch for one Project: each automation takes its turn, and one failing does not stop the other. The first failure
 * is thrown after both have run.
 */
export async function watchProject(
  argo: Pick<Argo, 'sessions' | 'changed'>,
  source: ChangesSource,
  projectId: string,
): Promise<void> {
  const turns = await Promise.allSettled([
    autoFix(argo, source, projectId),
    autoArchive(argo, source, projectId),
  ]);

  const failed = turns.find(isFailure);

  if (failed) throw failed.reason;
}
