import type { Argo } from '@argo/plugin-kit';
import {
  eventsOf,
  promptOf,
  type FixEvent,
  type FixFacts,
} from './pull-fix-prompts';
import type { FixRecord, FixStore } from './pull-fix-store';
import type { PullInfo } from './pull-info';

// Prompts Auto-fix sends on one head commit, with no new push, before it gives up (ADR-0055).
export const fixTries = 3;

export type Sessions = Pick<Argo['sessions'], 'prompt' | 'withdraw'>;

// What one pull request's turn works with.
export type Step = { sessions: Sessions; fix: FixStore; record: FixRecord };

type Listed = { head: string; keys: readonly string[] };

// Sends the Prompt and counts it, under the id it waits by when it was queued.
async function send(
  { sessions, fix, record }: Step,
  text: string,
  listed: Listed,
): Promise<void> {
  const answer = await sessions.prompt(record.sessionId, text);

  await fix.sentPrompt(record, {
    ...listed,
    queuedId: answer.status === 'queued' ? answer.queuedId : null,
  });
}

// A Prompt that could not be sent is not remembered, so the next Watch sends it.
async function prompt(
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

// The head's Checks have all reported and it has tries left.
const due = (facts: FixFacts, sent: number): boolean =>
  !facts.running && sent < fixTries;

async function promptUnseen(
  step: Step,
  facts: FixFacts,
  sent: number,
): Promise<boolean> {
  const unseen = await unseenOf(step, facts);

  if (unseen.length === 0) return false;

  await prompt(step, facts.pull, unseen);
  await stopIfSpent(step, { head: facts.pull.head, sent: sent + 1 });

  return true;
}

/*
 * One pull request's turn: one Prompt listing every failed Check, conflict and review comment Auto-fix has not seen,
 * sent once the head's Checks have all reported, never twice for the same event, and never past the tries a head gets.
 */
export async function fixCurrent(
  step: Step,
  facts: FixFacts,
): Promise<boolean> {
  const sent = await step.fix.sent(step.record, facts.pull.head);

  return due(facts, sent) ? promptUnseen(step, facts, sent) : false;
}
