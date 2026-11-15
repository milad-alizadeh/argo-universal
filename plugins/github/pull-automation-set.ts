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
import { fetchPull } from './pull-reads';
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

  if (kind !== 'merge')
    throw new Error(`Auto-${kind} is not available for this pull request.`);

  const named = await namedOf(scope, params.reference, caller);

  await requireAttached(scope, named, caller);
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
