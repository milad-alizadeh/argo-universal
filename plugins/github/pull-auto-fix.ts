import type { Argo } from '@argo/plugin-kit';
import type { Automation, Offers } from './pull-automations';
import { fetchComments } from './pull-comments';
import { autoFix, fixOf, openedByAnother } from './pull-fix';
import { failedOf, runningOf } from './pull-fix-facts';
import type { FixFacts } from './pull-fix-prompts';
import { fixCurrent } from './pull-fix-send';
import { createFixStore, type FixStore } from './pull-fix-store';
import { withdrawWaiting } from './pull-fix-withdraw';
import type { PullInfo } from './pull-info';
import { lowered, sameLink } from './pull-kept';
import { fetchChecks, fetchPull } from './pull-reads';
import type { PullLink } from './pull-store';
import { fetchViewer } from './pull-viewer';

type Fetch = Argo['fetch'];

// The pull request, once GitHub says the signed-in account opened it; Auto-fix is refused on anyone else's.
async function yoursOf(fetch: Fetch, link: PullLink): Promise<PullInfo> {
  const [pull, viewer] = await Promise.all([
    fetchPull(fetch, link),
    fetchViewer(fetch, link),
  ]);

  if (openedByAnother(pull, viewer))
    throw new Error('Only pull requests you opened can use Auto-fix.');

  return pull;
}

// Read all current problems before enabling, so a failed read never acts on an incomplete answer.
async function eventsNow(fetch: Fetch, link: PullLink): Promise<FixFacts> {
  const pull = await yoursOf(fetch, link);

  const [checks, comments] = await Promise.all([
    fetchChecks(fetch, { ...link, head: pull.head }),
    fetchComments(fetch, link),
  ]);

  return {
    pull,
    failed: failedOf(checks),
    running: runningOf(checks),
    comments,
  };
}

const isOn = async (fix: FixStore, link: PullLink): Promise<boolean> =>
  (await fix.forSessions([link.sessionId])).some(
    (record) => record.enabled && sameLink(record, link),
  );

/*
 * Turning it on prompts about current problems immediately. A failed read refuses enabling, and turning on what
 * is already on changes nothing. Later Watch turns use the same event history and prompt limit.
 */
async function enable(
  {
    fetch,
    sessions,
    fix,
  }: Pick<Argo, 'fetch' | 'sessions'> & { fix: FixStore },
  link: PullLink,
): Promise<void> {
  if (await isOn(fix, link)) return;

  const facts = await eventsNow(fetch, link);
  const record = { ...lowered(link), enabled: true, stopHead: null };

  await fix.enable(record, facts.pull.head);

  if (facts.pull.stage === 'open')
    await fixCurrent({ sessions, fix, record }, facts);
}

// Turning it off takes back its Prompts that still wait, so none starts after the person said stop.
async function disable(
  { sessions, fix }: Pick<Argo, 'sessions'> & { fix: FixStore },
  link: PullLink,
): Promise<void> {
  const record = { ...lowered(link), enabled: false, stopHead: null };

  await fix.disable(record);
  await withdrawWaiting({ sessions, fix, record });
}

// How Auto-fix is offered on each of these Sessions' pull requests, from what it keeps for them.
async function offersOf(
  fix: FixStore,
  sessionIds: readonly string[],
): Promise<Offers> {
  const records = await fix.forSessions(sessionIds);

  return (offered) =>
    fixOf(
      records.find((record) => sameLink(record, offered.link)),
      offered,
    );
}

/*
 * Auto-fix (ADR-0055): the Session's Agent is prompted once about each new failed Check, review comment and conflict
 * on a pull request, and it stops after three Prompts on one head commit. What it has seen and sent is its own.
 */
export function createAutoFix(
  argo: Pick<Argo, 'storage' | 'fetch' | 'sessions'>,
): Automation {
  const fix = createFixStore(argo);

  return {
    offers: (sessionIds) => offersOf(fix, sessionIds),
    set: (link, on) =>
      on ? enable({ ...argo, fix }, link) : disable({ ...argo, fix }, link),
    watch: (projectId, fresh) =>
      autoFix({ sessions: argo.sessions, fix }, fresh, projectId),
    forget: (link) => fix.forget(link),
  };
}
