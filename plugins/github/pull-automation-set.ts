import type { Argo } from '@argo/plugin-kit';
import {
  mergeOf,
  methodOf,
  type AutoMergeInfo,
  type MergeSettings,
} from './pull-automation';
import { fetchAutoMerge, fetchMergeSettings } from './pull-automation-reads';
import { disableAutoMerge, enableAutoMerge } from './pull-automation-writes';
import { requireAttached } from './pull-file-operations';
import type { PullInfo } from './pull-info';
import { namedOf, type Scope } from './pull-operations';
import { fetchPull } from './pull-reads';
import type { PullLink } from './pull-store';
import type { SessionCaller } from './session-caller';

export type AutomationParams = {
  reference: string;
  kind: 'fix' | 'merge' | 'archive';
  on: boolean;
};

// Auto-fix and Auto-archive are the Plugin's own, each behind its one interface; Auto-merge is GitHub's.
async function turn(
  scope: Scope,
  { kind, on }: AutomationParams,
  link: PullLink,
): Promise<void> {
  if (kind === 'merge') return apply(scope, link, on);

  await scope.automations[kind].set(link, on);
}

// Auto-merge is GitHub's own: its pull request record is read again so the Change shows what GitHub now says.
async function readBack(
  { sync }: Pick<Scope, 'sync'>,
  { kind }: AutomationParams,
  { sessionId }: PullLink,
): Promise<void> {
  if (kind === 'merge') await sync([sessionId]);
}

/*
 * Sets one automation on one pull request attached to the calling Session. Auto-merge is GitHub's own, so GitHub is
 * asked fresh and the Change reads `on` back from it afterwards. Auto-fix and Auto-archive are the Plugin's own, in
 * its own tables, and the Change shows them at once.
 */
export async function setAutomation(
  scope: Scope,
  params: AutomationParams,
  caller: SessionCaller,
): Promise<{ kind: AutomationParams['kind']; on: boolean }> {
  const named = await namedOf(scope, params.reference, caller);

  await requireAttached(scope, named, caller);
  await turn(scope, params, { ...named, ...caller });
  await readBack(scope, params, { ...named, ...caller });
  scope.changed();

  return { kind: params.kind, on: params.on };
}

type Target = { repository: string; number: number; projectId: string };

type Fetch = Argo['fetch'];

type Read = {
  pull: PullInfo;
  autoMerge: AutoMergeInfo;
  settings: MergeSettings;
};

async function readAll(fetch: Fetch, target: Target): Promise<Read> {
  const [pull, autoMerge, settings] = await Promise.all([
    fetchPull(fetch, target),
    fetchAutoMerge(fetch, target),
    fetchMergeSettings(fetch, target),
  ]);

  return { pull, autoMerge, settings };
}

async function turnOff(
  fetch: Fetch,
  target: Target,
  { autoMerge }: Read,
): Promise<void> {
  if (autoMerge.on) await disableAutoMerge(fetch, { ...autoMerge, ...target });
}

function requireAvailable({ pull, autoMerge, settings }: Read): void {
  const state = mergeOf(pull, { autoMerge, settings });

  if (!state.available)
    throw new Error(state.reason ?? 'Auto-merge is not available.');
}

async function turnOn(fetch: Fetch, target: Target, read: Read): Promise<void> {
  const { autoMerge, settings } = read;

  requireAvailable(read);

  if (autoMerge.on) return;

  await enableAutoMerge(fetch, {
    ...autoMerge,
    ...target,
    method: methodOf(settings),
  });
}

async function apply(
  { fetch }: Pick<Argo, 'fetch'>,
  target: Target,
  on: boolean,
): Promise<void> {
  const read = await readAll(fetch, target);

  await (on ? turnOn : turnOff)(fetch, target, read);
}
