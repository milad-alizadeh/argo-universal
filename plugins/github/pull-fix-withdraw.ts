import type { WaitingPrompt } from './pull-fix-rows';
import type { Step } from './pull-fix-send';
import type { PullInfo } from './pull-info';

// A waiting Prompt is stale once the pull request is no longer open at the head it was about.
const staleFor =
  (pull: PullInfo) =>
  ({ head }: WaitingPrompt): boolean =>
    pull.stage !== 'open' || head !== pull.head;

// Takes back one stale Prompt; one that already started still counts, and its events stay seen.
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

/*
 * A push or a close makes Auto-fix's queued Prompts about the old head stale, so it takes them back before they start
 * (ADR-0055). What a withdrawn Prompt listed may be prompted again on the new head.
 */
export async function withdrawStale(
  step: Step,
  pull: PullInfo,
): Promise<boolean> {
  const stale = (await step.fix.waiting(step.record)).filter(staleFor(pull));

  for (const waiting of stale) await withdrawOne(step, waiting);

  return stale.length > 0;
}
