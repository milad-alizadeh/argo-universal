import type { Argo } from '@argo/plugin-kit';
import type { AutomationState } from './pull-automation';
import type { CheckInfo } from './pull-checks';
import { eventKey } from './pull-fix-rows';
import type { FixRecord, FixStore } from './pull-fix-store';
import type { PullInfo } from './pull-info';
import type { Known } from './pull-known';
import { readChecks, readPull, type ChangesSource } from './pull-link-reads';
import { shortHead } from './pull-reads';

// Prompts Auto-fix sends on one head commit, with no new push, before it gives up (ADR-0055).
export const fixTries = 3;

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

const promptOf = (pull: PullInfo, check: string): string =>
  `Check \`${check}\` failed on ${pull.repository}#${pull.number} at ${short(pull.head)}. Read it, fix it, and push.`;

type Reads = Pick<ChangesSource, 'reads' | 'readState' | 'store'>;

type Acting = Pick<Argo, 'sessions' | 'changed'>;

export const failedOf = (checks: readonly CheckInfo[]): string[] =>
  checks.flatMap(({ name, state }) => (state === 'failed' ? [name] : []));

// A read that failed, or is only last known, is not acted on.
const dataOf = <Value>({ data, failure }: Known<Value>): Value | undefined =>
  failure ? undefined : data;

const openOf = (pull: Known<PullInfo>): PullInfo | undefined => {
  const data = dataOf(pull);

  return data?.stage === 'open' ? data : undefined;
};

type Fresh = { pull: PullInfo; failed: string[] };

async function checkedOf(
  source: Reads,
  record: FixRecord,
  pull: PullInfo,
): Promise<Fresh | undefined> {
  const checks = dataOf(await readChecks(source, record, pull.head));

  return checks && { pull, failed: failedOf(checks) };
}

// What is known now of one pull request and its head's Checks.
async function freshOf(
  source: Reads,
  record: FixRecord,
): Promise<Fresh | undefined> {
  const pull = openOf(await readPull(source, record));

  return pull && checkedOf(source, record, pull);
}

// What one pull request's turn works with.
type Step = { argo: Acting; fix: FixStore; record: FixRecord };

// A Prompt that could not be sent is not remembered, so the next Watch sends it.
async function prompt(
  { argo, fix, record }: Step,
  pull: PullInfo,
  check: string,
): Promise<void> {
  await fix.record(record, pull.head, check);

  try {
    await argo.sessions.prompt(record.sessionId, promptOf(pull, check));
  } catch (error) {
    await fix.unrecord(record, pull.head, check);
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

// The failed Checks of this head that Auto-fix has not seen, no more than the tries the head has left.
async function unseenOf(
  { fix, record }: Step,
  { pull, failed }: Fresh,
  sent: number,
): Promise<string[]> {
  const seen = await fix.seen(record, pull.head);

  return failed
    .filter((name) => !seen.has(eventKey(name)))
    .slice(0, Math.max(fixTries - sent, 0));
}

/*
 * One pull request's turn: a Prompt for each failed Check of the head commit that Auto-fix has not seen, never twice for
 * the same commit and Check, and never past the tries a head gets.
 */
async function turnOf(step: Step, fresh: Fresh): Promise<boolean> {
  const { head } = fresh.pull;
  const sent = await step.fix.sent(step.record, head);
  const unseen = await unseenOf(step, fresh, sent);

  for (const check of unseen) await prompt(step, fresh.pull, check);

  const stopped = await stopIfSpent(step, { head, sent: sent + unseen.length });

  return stopped || unseen.length > 0;
}

async function fixOne(
  argo: Acting,
  reads: Reads,
  record: FixRecord,
): Promise<boolean> {
  const fresh = await freshOf(reads, record);

  return fresh ? turnOf({ argo, fix: reads.store.fix, record }, fresh) : false;
}

type Turn = PromiseSettledResult<boolean>;

// Each pull request takes its turn in order; one failing does not stop the others.
async function inTurn(
  argo: Acting,
  reads: Reads,
  records: readonly FixRecord[],
): Promise<Turn[]> {
  const turns: Turn[] = [];

  for (const record of records)
    turns.push(...(await Promise.allSettled([fixOne(argo, reads, record)])));

  return turns;
}

const acted = (turn: Turn): boolean =>
  turn.status === 'fulfilled' && turn.value;

const isFailure = (turn: Turn): turn is PromiseRejectedResult =>
  turn.status === 'rejected';

async function takeTurns(
  argo: Acting,
  reads: Reads,
  records: readonly FixRecord[],
): Promise<void> {
  argo.changed();

  const turns = await inTurn(argo, reads, records);

  if (turns.some(acted)) argo.changed();

  const failed = turns.find(isFailure);

  if (failed) throw failed.reason;
}

/*
 * The Watch's Auto-fix step for one Project: each pull request with Auto-fix on is read fresh and given its Prompts. One
 * pull request failing does not stop the others; the first failure is thrown after all have had their turn.
 */
export async function autoFix(
  argo: Acting,
  reads: Reads,
  projectId: string,
): Promise<void> {
  const records = await reads.store.fix.enabledIn(projectId);

  if (records.length > 0) await takeTurns(argo, reads, records);
}
