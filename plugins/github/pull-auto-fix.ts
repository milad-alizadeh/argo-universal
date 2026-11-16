import type { Argo } from '@argo/plugin-kit';
import type { Automation, Offers } from './pull-automations';
import { fetchComments } from './pull-comments';
import { autoFix, failedOf, fixOf } from './pull-fix';
import { eventsOf } from './pull-fix-prompts';
import { createFixStore, type FixStore } from './pull-fix-store';
import { sameLink } from './pull-kept';
import { fetchChecks, fetchPull } from './pull-reads';
import type { PullLink } from './pull-store';

type Fetch = Argo['fetch'];

// The head commit, and the keys of every event Auto-fix could prompt about on it now.
async function eventsNow(
  fetch: Fetch,
  link: PullLink,
): Promise<{ head: string; keys: string[] }> {
  const pull = await fetchPull(fetch, link);

  const [checks, comments] = await Promise.all([
    fetchChecks(fetch, { ...link, head: pull.head }),
    fetchComments(fetch, link),
  ]);

  const events = eventsOf({ pull, failed: failedOf(checks), comments });

  return { head: pull.head, keys: events.map(({ key }) => key) };
}

const isOn = async (fix: FixStore, link: PullLink): Promise<boolean> =>
  (await fix.forSessions([link.sessionId])).some(
    (record) => record.enabled && sameLink(record, link),
  );

/*
 * Turning it on reads the head's Checks, the review comments and the conflict first, so one already there is not
 * prompted, and a read that fails refuses turning it on rather than guessing. Turning it on when it is on changes nothing.
 */
async function enable(
  { fetch, fix }: { fetch: Fetch; fix: FixStore },
  link: PullLink,
): Promise<void> {
  if (await isOn(fix, link)) return;

  const { head, keys } = await eventsNow(fetch, link);

  await fix.enable(link, head, keys);
}

const lowered = (link: PullLink): PullLink => ({
  ...link,
  repository: link.repository.toLowerCase(),
});

// How Auto-fix is offered on each of these Sessions' pull requests, from what it keeps for them.
async function offersOf(
  fix: FixStore,
  sessionIds: readonly string[],
): Promise<Offers> {
  const records = await fix.forSessions(sessionIds);

  return (link, pull) =>
    fixOf(
      records.find((record) => sameLink(record, link)),
      pull,
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
      on
        ? enable({ fetch: argo.fetch, fix }, lowered(link))
        : fix.disable(lowered(link)),
    watch: (projectId, fresh) =>
      autoFix({ sessions: argo.sessions, fix }, fresh, projectId),
    forget: (link) => fix.forget(link),
  };
}
