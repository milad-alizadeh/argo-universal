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
import { failedOf } from './pull-fix';
import type { PullInfo } from './pull-info';
import { namedOf, type Scope } from './pull-operations';
import { fetchChecks, fetchPull } from './pull-reads';
import type { SessionCaller } from './session-caller';

export type AutomationParams = {
  reference: string;
  kind: 'fix' | 'merge' | 'archive';
  on: boolean;
};

async function turn(
  scope: Scope,
  { kind, on }: AutomationParams,
  { sessionId, ...target }: FixTarget,
): Promise<void> {
  if (kind === 'archive')
    return setArchive(scope.store, { ...target, sessionId }, on);

  return kind === 'fix'
    ? setFix(scope, { ...target, sessionId }, on)
    : apply(scope, target, on);
}

/*
 * Sets one automation on one pull request attached to the calling Session. Auto-merge is GitHub's own, so GitHub is
 * asked fresh and nothing is stored: the Change reads `on` back from GitHub afterwards. Auto-fix and Auto-archive are
 * the Plugin's own.
 */
export async function setAutomation(
  scope: Scope,
  params: AutomationParams,
  caller: SessionCaller,
): Promise<{ kind: AutomationParams['kind']; on: boolean }> {
  const named = await namedOf(scope, params.reference, caller);

  await requireAttached(scope, named, caller);
  await turn(scope, params, { ...named, ...caller });
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

type FixTarget = Target & { sessionId: string };

const isOn = async (
  { store }: Pick<Scope, 'store'>,
  { sessionId, repository, number }: FixTarget,
): Promise<boolean> =>
  (await store.fix.forSessions([sessionId])).some(
    (record) =>
      record.repository === repository &&
      record.number === number &&
      record.enabled,
  );

async function enableFix(
  { fetch, store }: Pick<Scope, 'fetch' | 'store'>,
  target: FixTarget,
  link: FixTarget,
): Promise<void> {
  const { head } = await fetchPull(fetch, target);
  const checks = await fetchChecks(fetch, { ...target, head });

  await store.fix.enable(link, head, failedOf(checks));
}

/*
 * Auto-fix is the Plugin's own: turning it on reads the head's Checks first, so a failure already there is not
 * prompted, and a read that fails refuses turning it on rather than guessing. Turning it on when it is on changes nothing.
 */
async function setFix(
  scope: Pick<Scope, 'fetch' | 'store'>,
  target: FixTarget,
  on: boolean,
): Promise<void> {
  const link = { ...target, repository: target.repository.toLowerCase() };

  if (!on) return scope.store.fix.disable(link);

  if (!(await isOn(scope, link))) await enableFix(scope, target, link);
}

// Auto-archive is a record per pull request, kept until it is turned off, spent or detached; it asks GitHub nothing.
function setArchive(
  { archive }: Pick<Scope['store'], 'archive'>,
  target: FixTarget,
  on: boolean,
): Promise<void> {
  const link = { ...target, repository: target.repository.toLowerCase() };

  return on ? archive.enable(link) : archive.disable(link);
}
