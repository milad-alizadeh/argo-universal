import type { Argo } from '@argo/plugin-kit';
import {
  checkEvent,
  eventsOf,
  promptOf,
  stillRedAfterMs,
  stillRedPromptOf,
  type FixEvent,
  type FixFacts,
} from './pull-fix-prompts';
import { PromptRefused } from './pull-fix-rest';
import type { FixRecord, FixStore } from './pull-fix-store';
import type { PullInfo } from './pull-info';

// Prompts Auto-fix sends on one head commit, with no new push, before it gives up (ADR-0055).
export const fixTries = 3;

export type Sessions = Pick<Argo['sessions'], 'get' | 'prompt' | 'withdraw'>;

// What one pull request's turn works with.
export type Step = { sessions: Sessions; fix: FixStore; record: FixRecord };

type Listed = { head: string; keys: readonly string[] };

// Sends the Prompt and counts it, under the id it waits by when it was queued.
async function send(
  { sessions, fix, record }: Step,
  text: string,
  listed: Listed,
): Promise<void> {
  const answer = await sessions
    .prompt(record.sessionId, text)
    .catch((cause: unknown) => {
      throw new PromptRefused('The Session refused the Prompt', { cause });
    });

  await fix.sentPrompt(record, {
    ...listed,
    queuedId: answer.status === 'queued' ? answer.queuedId : null,
  });
}

// A Prompt that could not be sent is not remembered, so the next Watch sends it.
async function promptEvents(
  step: Step,
  pull: PullInfo,
  events: readonly FixEvent[],
): Promise<void> {
  const listed = { head: pull.head, keys: events.map(({ key }) => key) };

  await step.fix.record(step.record, listed.head, listed.keys);

  try {
    await send(step, promptOf(pull, events), listed);
  } catch (error) {
    await step.fix.unrecord(step.record, listed.head, listed.keys);
    throw error;
  }
}

// The third Prompt on a head turns Auto-fix off.
async function stopIfSpent(
  { fix, record }: Step,
  { head, sent }: { head: string; sent: number },
): Promise<void> {
  if (sent >= fixTries) await fix.stop(record, head);
}

// The events of this head that Auto-fix has not seen.
async function unseenOf(
  { fix, record }: Step,
  facts: FixFacts,
): Promise<FixEvent[]> {
  const seen = await fix.seen(record, facts.pull.head);

  return eventsOf(facts).filter(({ key }) => !seen.has(key));
}

async function promptUnseen(
  step: Step,
  facts: FixFacts,
  sent: number,
): Promise<boolean> {
  const unseen = await unseenOf(step, facts);

  if (unseen.length === 0) return false;

  await promptEvents(step, facts.pull, unseen);
  await stopIfSpent(step, { head: facts.pull.head, sent: sent + 1 });

  return true;
}

// The Session has sat idle long enough that its Agent may be waiting on the person; a busy one has no idle time.
async function isIdleLong({ sessions, record }: Step): Promise<boolean> {
  const idleFor = (await sessions.get(record.sessionId))?.idleFor;

  return (idleFor ?? 0) >= stillRedAfterMs;
}

// Auto-fix already prompted about this head, every Check has reported, and one still failed.
const isStillRed = (facts: FixFacts, sent: number): boolean =>
  [sent > 0, !facts.running, facts.failed.length > 0].every(Boolean);

// The still-red Prompt counts as a try, so a head never gets more than three Prompts.
async function sendStillRed(
  step: Step,
  facts: FixFacts,
  sent: number,
): Promise<boolean> {
  // CI only: a conflict or comment has its own event.
  const events = facts.failed.map(checkEvent);
  const { head } = facts.pull;

  await send(step, stillRedPromptOf(facts.pull, events), {
    head,
    keys: events.map(({ key }) => key),
  });
  await stopIfSpent(step, { head, sent: sent + 1 });

  return true;
}

/*
 * CI is still red on a head Auto-fix already prompted about and the Session has sat idle: the Agent is prompted again
 * to go on and push.
 */
async function promptStillRed(
  step: Step,
  facts: FixFacts,
  sent: number,
): Promise<boolean> {
  if (!isStillRed(facts, sent) || !(await isIdleLong(step))) return false;

  return sendStillRed(step, facts, sent);
}

/*
 * One pull request's pass in a Watch: one Prompt listing every failed Check run, conflict and review comment Auto-fix
 * has not seen, never twice for the same event, and never past the tries a head gets. With nothing new, a head still red
 * after the Session sat idle is prompted again.
 */
export async function fixCurrent(
  step: Step,
  facts: FixFacts,
): Promise<boolean> {
  const sent = await step.fix.sent(step.record, facts.pull.head);

  if (sent >= fixTries) return false;

  return (
    (await promptUnseen(step, facts, sent)) || promptStillRed(step, facts, sent)
  );
}
