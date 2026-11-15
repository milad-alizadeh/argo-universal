import type { Argo } from '@argo/plugin-kit';
import type { AutomationState } from './pull-automation';
import type { LinkRead } from './pull-changes';
import type { CheckInfo } from './pull-checks';
import type { CommentInfo } from './pull-comments';
import { eventsOf, type FixEvent, type FixFacts } from './pull-fix-prompts';
import type { FixRecord, FixStore } from './pull-fix-store';
import { freshOf, type Watching } from './pull-fresh';
import type { PullInfo } from './pull-info';
import type { Known } from './pull-known';
import { shortHead } from './pull-reads';
import { takeTurns } from './pull-turns';

// Prompts Auto-fix sends on one head commit, with no new push, before it gives up (ADR-0055).
const fixTries = 3;

const short = (head: string): string => head.slice(0, shortHead);

const idle: AutomationState = { on: false, available: true };

const stoppedOf = (head: string): AutomationState => ({
  ...idle,
  reason: `Stopped after ${fixTries} tries on \`${short(head)}\``,
});

const isOn = (record?: FixRecord): boolean => record?.enabled === true;

const stoppedOn = (record: FixRecord | undefined, head: string): boolean =>
  record?.stopHead === head;

// Auto-fix as the Change offers it: any attached pull request can use it, and a stop is told while its commit is the head.
export function fixOf(
  record: FixRecord | undefined,
  { head }: Pick<PullInfo, 'head'>,
): AutomationState {
  if (isOn(record)) return { on: true, available: true };

  return stoppedOn(record, head) ? stoppedOf(head) : idle;
}

type Acting = Pick<Argo, 'sessions'> & { changed: () => void };

export const failedOf = (checks: readonly CheckInfo[]): string[] =>
  checks.flatMap(({ name, state }) => (state === 'failed' ? [name] : []));

// A read that failed, or is only last known, is not acted on.
const dataOf = <Value>({ data, failure }: Known<Value>): Value | undefined =>
  failure ? undefined : data;

const openOf = (pull: Known<PullInfo>): PullInfo | undefined => {
  const data = dataOf(pull);

  return data?.stage === 'open' ? data : undefined;
};

const failedIn = (checks?: Known<CheckInfo[]>): string[] | undefined => {
  const reported = checks && dataOf(checks);

  return reported && failedOf(reported);
};

const commentsIn = (
  comments?: Known<CommentInfo[]>,
): CommentInfo[] | undefined => comments && dataOf(comments);

/*
 * What is known now of one pull request, its head's Checks and its review comments. A read that failed leaves nothing
 * to act on: a failed comments read is never taken for no comments, and holds back the Checks' Prompts too.
 */
const withChecks = (
  { pull, checks }: LinkRead,
  comments: CommentInfo[],
): FixFacts | undefined => {
  const open = openOf(pull);
  const failed = failedIn(checks);

  return open && failed && { pull: open, failed, comments };
};

const checkedOf = (read: LinkRead): FixFacts | undefined => {
  const comments = commentsIn(read.comments);

  return comments && withChecks(read, comments);
};

async function freshRead(
  watching: Watching,
  record: FixRecord,
): Promise<FixFacts | undefined> {
  const read = await freshOf(watching, record);

  return read && checkedOf(read);
}

// What one pull request's turn works with.
type Step = { argo: Acting; fix: FixStore; record: FixRecord };

// A Prompt that could not be sent is not remembered, so the next Watch sends it.
async function prompt(
  { argo, fix, record }: Step,
  head: string,
  { key, text }: FixEvent,
): Promise<void> {
  await fix.record(record, head, key);

  try {
    await argo.sessions.prompt(record.sessionId, text);
  } catch (error) {
    await fix.unrecord(record, head, key);
    throw error;
  }
}

// The third Prompt on a head turns Auto-fix off.
async function stopIfSpent(
  { fix, record }: Step,
  { head, sent }: { head: string; sent: number },
): Promise<boolean> {
  if (sent < fixTries) return false;

  await fix.stop(record, head);

  return true;
}

// The events of this head that Auto-fix has not seen, no more than the tries the head has left.
async function unseenOf(
  { fix, record }: Step,
  facts: FixFacts,
  sent: number,
): Promise<FixEvent[]> {
  const seen = await fix.seen(record, facts.pull.head);

  return eventsOf(facts)
    .filter(({ key }) => !seen.has(key))
    .slice(0, Math.max(fixTries - sent, 0));
}

/*
 * One pull request's turn: a Prompt for each failed Check, conflict and review comment Auto-fix has not seen, never
 * twice for the same event, and never past the tries a head gets.
 */
async function turnOf(step: Step, fresh: FixFacts): Promise<boolean> {
  const { head } = fresh.pull;
  const sent = await step.fix.sent(step.record, head);
  const unseen = await unseenOf(step, fresh, sent);

  for (const event of unseen) await prompt(step, head, event);

  const stopped = await stopIfSpent(step, { head, sent: sent + unseen.length });

  return stopped || unseen.length > 0;
}

async function fixOne(
  argo: Acting,
  watching: Watching,
  record: FixRecord,
): Promise<boolean> {
  const fresh = await freshRead(watching, record);

  return fresh
    ? turnOf({ argo, fix: watching.store.fix, record }, fresh)
    : false;
}

/*
 * The Watch's Auto-fix step for one Project: each pull request with Auto-fix on is read fresh and given its Prompts. One
 * pull request failing does not stop the others.
 */
export async function autoFix(
  argo: Acting,
  watching: Watching,
  projectId: string,
): Promise<void> {
  await takeTurns(
    argo,
    await watching.store.fix.enabledIn(projectId),
    (record) => fixOne(argo, watching, record),
  );
}
