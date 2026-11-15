import type { Argo } from '@argo/plugin-kit';
import type { ChangesSource } from './pull-changes';
import type { CheckInfo } from './pull-checks';
import type { PullInfo } from './pull-info';
import { known } from './pull-known';
import type { FixRecord } from './pull-fix-store';
import { shortHead } from './pull-reads';
import type { AutomationState } from './pull-automation';

// Prompts Auto-fix sends on one head commit, with no new push, before it gives up (ADR-0055).
export const fixTries = 3;

const short = (head: string): string => head.slice(0, shortHead);

// Auto-fix as the Change offers it: any attached pull request can use it, and a stop is told while its commit is the head.
export function fixOf(
  record: FixRecord | undefined,
  pull: Pick<PullInfo, 'head'>,
): AutomationState {
  if (record?.enabled) return { on: true, available: true };

  if (record?.stopHead && record.stopHead === pull.head)
    return {
      on: false,
      available: true,
      reason: `Stopped after ${fixTries} tries on \`${short(pull.head)}\``,
    };

  return { on: false, available: true };
}

const promptOf = (pull: PullInfo, check: string): string =>
  `Check \`${check}\` failed on ${pull.repository}#${pull.number} at ${short(pull.head)}. Read it, fix it, and push.`;

type Reads = Pick<ChangesSource, 'reads' | 'readState' | 'store'>;

type Acting = Pick<Argo, 'sessions' | 'changed'>;

export const failedOf = (checks: readonly CheckInfo[]): string[] =>
  checks.filter(({ state }) => state === 'failed').map(({ name }) => name);

// What is known now of one pull request and its head's Checks; a read that failed, or is only last known, is not acted on.
async function freshOf(
  { reads, readState }: Reads,
  record: FixRecord,
): Promise<{ pull: PullInfo; failed: string[] } | undefined> {
  const target = {
    projectId: record.projectId,
    repository: record.repository,
    number: record.number,
  };
  const options = { projectId: record.projectId };
  const pull = await known(() => readState(reads.pull(target), options));

  if (pull.failure || !pull.data || pull.data.stage !== 'open') return undefined;

  const { head } = pull.data;

  const checks = await known(() =>
    readState(
      reads.checks({
        projectId: record.projectId,
        repository: record.repository,
        head,
      }),
      options,
    ),
  );

  if (checks.failure || !checks.data) return undefined;

  return { pull: pull.data, failed: failedOf(checks.data) };
}

/*
 * One pull request's turn: a Prompt for each failed Check of the head commit that Auto-fix has not seen, never twice for
 * the same commit and Check. The third Prompt on a head turns Auto-fix off. A Prompt that could not be sent is not
 * remembered, so the next Watch sends it.
 */
async function fixOne(
  argo: Acting,
  reads: Reads,
  record: FixRecord,
): Promise<boolean> {
  const fresh = await freshOf(reads, record);

  if (!fresh) return false;

  const { pull, failed } = fresh;
  const { fix } = reads.store;
  const seen = await fix.seen(record, pull.head);
  let sent = await fix.sent(record, pull.head);
  let acted = false;

  for (const check of failed.filter((name) => !seen.has(`check:${name}`))) {
    if (sent >= fixTries) break;

    await fix.record(record, pull.head, check);

    try {
      await argo.sessions.prompt(record.sessionId, promptOf(pull, check));
    } catch (error) {
      await fix.unrecord(record, pull.head, check);
      throw error;
    }

    sent += 1;
    acted = true;
  }

  if (sent >= fixTries) {
    await fix.stop(record, pull.head);
    acted = true;
  }

  return acted;
}

/*
 * The Watch's Auto-fix step for one Project: each pull request with Auto-fix on is read fresh and given its Prompts. One
 * pull request failing does not stop the others; the first failure is thrown after all have had their turn.
 */
export async function autoFix(
  argo: Acting & Pick<Argo, 'changed'>,
  reads: Reads,
  projectId: string,
): Promise<void> {
  const records = await reads.store.fix.enabledIn(projectId);

  if (records.length === 0) return;

  argo.changed();

  const failures: unknown[] = [];
  let acted = false;

  for (const record of records)
    try {
      acted = (await fixOne(argo, reads, record)) || acted;
    } catch (error) {
      failures.push(error);
    }

  if (acted) argo.changed();

  if (failures.length > 0) throw failures[0];
}
