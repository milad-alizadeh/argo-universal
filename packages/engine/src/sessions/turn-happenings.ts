/*
 * What a Session reports of its Turns as they happen, emitted by its actor: the Turn a queued Prompt was taken into,
 * steered into the running Turn or started by the queue, and each Turn's end. A follower of a Prompt or of the Session's
 * work reads these instead of the Session's private context.
 */
export type TurnHappening =
  | { type: 'prompt.taken'; queuedId: string; turnId: string }
  // `error` is the message of a Turn that failed.
  | {
      type: 'turn.ended';
      turnId: string;
      stopReason: string;
      error: string | null;
    };

// A queued Prompt was taken into a Turn: steered into the running one, or started by the queue.
export const promptTaken = (
  queuedId: string,
  turnId: string,
): TurnHappening => ({ type: 'prompt.taken', queuedId, turnId });
