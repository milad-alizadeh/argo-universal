import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import type { PluginClock } from '../clock';
import type { CallOutcome, Ended } from '../runtime/worker-calls';
import { itemsLeftOut, leftOut, type Reply } from './kept-items';

// How long one batched call may take before its Plugin is left out of that answer.
export const slotItemsLimitMs = 2000;

/*
 * How long a call that ran late is still waited on. Its answer, when it lands, is kept and the open lists ask again,
 * so a Plugin that is slow on every ask still reaches them, rather than its last good items standing in for good.
 */
export const slotItemsLateLimitMs = 30_000;

// A Plugin that is not running, or stops mid-call, is left out as not running.
const endedReason: Record<Ended, Reply> = {
  notRunning: leftOut(itemsLeftOut.notRunning),
  stopped: leftOut(itemsLeftOut.notRunning),
  late: leftOut(itemsLeftOut.late),
};

// What a call came to: its items, or why its Plugin is left out.
export function replyOf(outcome: CallOutcome<SlotCall>): Reply {
  if ('ended' in outcome) return endedReason[outcome.ended];

  const answer = outcome.answered;

  return answer.action === 'items'
    ? { ok: true, items: answer.items }
    : leftOut(itemsLeftOut.threw);
}

// The call's reply, or late once it takes longer than the limit; a reply that lands after that goes to `landed`.
export function within(
  clock: PluginClock,
  reply: Promise<Reply>,
  landed: (reply: Reply) => void,
): Promise<Reply> {
  const { promise, resolve } = Promise.withResolvers<Reply>();

  const cancel = clock.schedule((): void => {
    resolve(leftOut(itemsLeftOut.late));
    void reply.then(landed);
  }, slotItemsLimitMs);

  void reply.finally(cancel).then(resolve);

  return promise;
}
