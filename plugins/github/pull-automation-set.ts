import type { Argo } from '@argo/plugin-kit';
import {
  disableAutoMerge,
  enableAutoMerge,
  fetchAutoMerge,
  fetchMergeSettings,
  mergeOf,
  methodOf,
} from './pull-automation';
import { requireAttached } from './pull-file-operations';
import { namedOf, type Scope } from './pull-operations';
import { fetchChecks, fetchPull } from './pull-reads';
import { failedOf } from './pull-fix';
import type { SessionCaller } from './session-caller';

export type AutomationParams = {
  reference: string;
  kind: 'fix' | 'merge' | 'archive';
  on: boolean;
};

/*
 * Sets one automation on one pull request attached to the calling Session. Only Auto-merge is offered for now; it is
 * GitHub's own, so GitHub is asked fresh, and nothing is stored: the Change reads `on` back from GitHub afterwards.
 */
export async function setAutomation(
  scope: Scope,
  params: AutomationParams,
  caller: SessionCaller,
): Promise<{ kind: AutomationParams['kind']; on: boolean }> {
  const { kind, on } = params;

  if (kind !== 'merge' && kind !== 'fix')
    throw new Error(`Auto-${kind} is not available for this pull request.`);

  const named = await namedOf(scope, params.reference, caller);

  await requireAttached(scope, named, caller);

  if (kind === 'fix') {
    await setFix(scope, { ...named, ...caller }, on);
    scope.changed();

    return { kind, on };
  }

  await apply(scope, { ...named, projectId: caller.projectId }, on);
  scope.changed();

  return { kind, on };
}

type Target = { repository: string; number: number; projectId: string };

async function apply(
  { fetch }: Pick<Argo, 'fetch'>,
  target: Target,
  on: boolean,
): Promise<void> {
  const [pull, autoMerge, settings] = await Promise.all([
    fetchPull(fetch, target),
    fetchAutoMerge(fetch, target),
    fetchMergeSettings(fetch, target),
  ]);

  if (!on) {
    if (autoMerge.on)
      await disableAutoMerge(fetch, { ...autoMerge, ...target });

    return;
  }

  const state = mergeOf(pull, { autoMerge, settings });

  if (!state.available)
    throw new Error(state.reason ?? 'Auto-merge is not available.');

  if (autoMerge.on) return;

  await enableAutoMerge(fetch, {
    ...autoMerge,
    ...target,
    method: methodOf(settings),
  });
}

type FixTarget = Target & { sessionId: string };

/*
 * Auto-fix is the Plugin's own: turning it on reads the head's Checks first, so a failure already there is not
 * prompted, and a read that fails refuses turning it on rather than guessing. Turning it on when it is on changes nothing.
 */
async function setFix(
  { fetch, store }: Pick<Scope, 'fetch' | 'store'>,
  target: FixTarget,
  on: boolean,
): Promise<void> {
  const link = { ...target, repository: target.repository.toLowerCase() };

  if (!on) return store.fix.disable(link);

  const [record] = (await store.fix.forSessions([target.sessionId])).filter(
    ({ repository, number }) =>
      repository === link.repository && number === link.number,
  );

  if (record?.enabled) return;

  const { head } = await fetchPull(fetch, target);
  const checks = await fetchChecks(fetch, { ...target, head });

  await store.fix.enable(link, head, failedOf(checks));
}
