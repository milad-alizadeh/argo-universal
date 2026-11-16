import type { Argo } from '@argo/plugin-kit';
import type { AutomationState } from './pull-automation';
import type { Fresh } from './pull-automations';
import type { LinkRead } from './pull-changes';
import type { CheckInfo } from './pull-checks';
import type { CommentInfo } from './pull-comments';
import { eventsOf, type FixEvent, type FixFacts } from './pull-fix-prompts';
import type { FixRecord, FixStore } from './pull-fix-store';
import { freshOf } from './pull-fresh';
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

const notYours = 'Only pull requests you opened';

// Opened by another account. An author or a signed-in account not known says nothing, so it is never taken for another.
export const openedByAnother = (
  { author }: Pick<PullInfo, 'author'>,
  viewer?: string,
): boolean =>
  author !== undefined &&
  viewer !== undefined &&
  author.toLowerCase() !== viewer.toLowerCase();

const yoursOf = (
  record: FixRecord | undefined,
  head: string,
): AutomationState => {
  if (isOn(record)) return { on: true, available: true };

  return stoppedOn(record, head) ? stoppedOf(head) : idle;
};

/*
 * Auto-fix as the Change offers it: only on a pull request the signed-in account opened, and a stop is told while its
 * commit is the head.
 */
export function fixOf(
  record: FixRecord | undefined,
  { pull, viewer }: { pull: PullInfo; viewer?: string },
): AutomationState {
  return openedByAnother(pull, viewer)
    ? { on: false, available: false, reason: notYours }
    : yoursOf(record, pull.head);
}

type Sessions = Pick<Argo['sessions'], 'prompt'>;

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
const withComments = (
  { pull, checks }: LinkRead,
  comments: CommentInfo[],
): FixFacts | undefined => {
  const open = openOf(pull);
  const failed = failedIn(checks);

  return open && failed && { pull: open, failed, comments };
};

const factsOf = (read: LinkRead): FixFacts | undefined => {
  const comments = commentsIn(read.comments);

  return comments && withComments(read, comments);
};

async function freshRead(
  fresh: Fresh,
  record: FixRecord,
): Promise<FixFacts | undefined> {
  const read = await freshOf(fresh, record);

  return read && factsOf(read);
}

// What one pull request's turn works with.
type Step = { sessions: Sessions; fix: FixStore; record: FixRecord };

// A Prompt that could not be sent is not remembered, so the next Watch sends it.
async function prompt(
  { sessions, fix, record }: Step,
  head: string,
  { key, text }: FixEvent,
): Promise<void> {
  await fix.record(record, head, key);

  try {
    await sessions.prompt(record.sessionId, text);
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

// What Auto-fix's Watch turn works with: the Sessions it prompts, and the record of what it has seen and sent.
export type Fixing = { sessions: Sessions; fix: FixStore };

async function fixOne(
  fixing: Fixing,
  fresh: Fresh,
  record: FixRecord,
): Promise<boolean> {
  const facts = await freshRead(fresh, record);

  return facts ? turnOf({ ...fixing, record }, facts) : false;
}

/*
 * The Watch's Auto-fix step for one Project: each pull request with Auto-fix on is read fresh and given its Prompts. One
 * pull request failing does not stop the others.
 */
export async function autoFix(
  fixing: Fixing,
  fresh: Fresh,
  projectId: string,
): Promise<void> {
  await takeTurns(fresh, await fixing.fix.enabledIn(projectId), (record) =>
    fixOne(fixing, fresh, record),
  );
}
