import type { WaitingPrompt } from './pull-fix-rows';
import type { Step } from './pull-fix-send';
import type { PullInfo } from './pull-info';

// A waiting Prompt is stale once the pull request is no longer open at the head it was about.
const staleFor =
  (pull: PullInfo) =>
  ({ head }: WaitingPrompt): boolean =>
    pull.stage !== 'open' || head !== pull.head;

// Takes back one waiting Prompt; one that already started still counts, and its events stay seen.
async function withdrawOne(
  { sessions, fix, record }: Step,
  waiting: WaitingPrompt,
): Promise<void> {
  const { withdrawn } = await sessions.withdraw(
    record.sessionId,
    waiting.queuedId,
  );

  await (withdrawn
    ? fix.withdrawn(record, waiting)
    : fix.started(record, waiting));
}

const isFailure = (
  turn: PromiseSettledResult<void>,
): turn is PromiseRejectedResult => turn.status === 'rejected';

/*
 * Each Prompt is taken back in turn, and one that cannot be is left waiting for the next Watch to try again; the first
 * failure is thrown once all have had their turn.
 */
async function withdrawEach(
  step: Step,
  prompts: readonly WaitingPrompt[],
): Promise<void> {
  const turns: PromiseSettledResult<void>[] = [];

  for (const waiting of prompts)
    turns.push(...(await Promise.allSettled([withdrawOne(step, waiting)])));

  const failed = turns.find(isFailure);

  if (failed) throw failed.reason;
}

/*
 * A push or a close makes Auto-fix's queued Prompts about the old head stale, so it takes them back before they start
 * (ADR-0055). What a withdrawn Prompt listed may be prompted again on the new head.
 */
export async function withdrawStale(
  step: Step,
  pull: PullInfo,
): Promise<boolean> {
  const stale = (await step.fix.waiting(step.record)).filter(staleFor(pull));

  await withdrawEach(step, stale);

  return stale.length > 0;
}

// Turning Auto-fix off takes back every Prompt of it that still waits.
export async function withdrawWaiting(step: Step): Promise<void> {
  await withdrawEach(step, await step.fix.waiting(step.record));
}
