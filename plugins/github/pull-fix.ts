import type { AutomationState } from './pull-automation';
import type { Fresh } from './pull-automations';
import type { LinkRead } from './pull-changes';
import { dataOf, factsOf } from './pull-fix-facts';
import {
  fixCurrent,
  fixTries,
  type Sessions,
  type Step,
} from './pull-fix-send';
import type { FixRecord, FixStore } from './pull-fix-store';
import { withdrawStale } from './pull-fix-withdraw';
import { freshOf } from './pull-fresh';
import type { PullInfo } from './pull-info';
import { shortHead } from './pull-reads';
import { takeTurns } from './pull-turns';

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

// What Auto-fix's Watch turn works with: the Sessions it prompts, and the record of what it has seen and sent.
export type Fixing = { sessions: Sessions; fix: FixStore };

async function fixOpen(
  step: Step,
  pull: PullInfo,
  read: LinkRead,
): Promise<boolean> {
  const facts = factsOf(pull, read);

  return facts ? fixCurrent(step, facts) : false;
}

// A withdraw that failed is thrown only after the head had its Prompt, so it never holds the Prompt back.
function afterWithdraw(
  withdrawal: PromiseSettledResult<boolean>,
  fixed: boolean,
): boolean {
  if (withdrawal.status === 'rejected') throw withdrawal.reason;

  return withdrawal.value || fixed;
}

// Stale Prompts are taken back first, then the open head is given its Prompt.
async function fixPull(
  step: Step,
  pull: PullInfo,
  read: LinkRead,
): Promise<boolean> {
  const [withdrawal] = await Promise.allSettled([withdrawStale(step, pull)]);

  return afterWithdraw(withdrawal, await fixOpen(step, pull, read));
}

function fixRead(step: Step, read: LinkRead): Promise<boolean> | false {
  const pull = dataOf(read.pull);

  return pull ? fixPull(step, pull, read) : false;
}

/*
 * Only a Session of the Project the Watch runs for can be prompted or have a Prompt taken back; the Server refuses
 * any other. A Session that is gone has its record forgotten. One that moved to another Project keeps its record,
 * as it can move back, and is left alone meanwhile.
 */
async function inProject(
  { sessions, fix }: Fixing,
  record: FixRecord,
): Promise<boolean> {
  const session = await sessions.get(record.sessionId);

  if (!session) await fix.forget(record);

  return session?.projectId === record.projectId;
}

async function fixOne(
  fixing: Fixing,
  fresh: Fresh,
  record: FixRecord,
): Promise<boolean> {
  if (!(await inProject(fixing, record))) return false;

  const read = await freshOf(fresh, record);

  return read ? fixRead({ ...fixing, record }, read) : false;
}

/*
 * The Watch's Auto-fix step for one Project: each pull request with Auto-fix on is read fresh, its stale queued Prompts
 * are taken back, and it is given its Prompt. One pull request failing does not stop the others.
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
