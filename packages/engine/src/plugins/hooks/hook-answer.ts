import type { HookOutcome, Json } from '@repo/contracts/plugins/hook-protocol';
import { failureLine } from './hook-failure';
import { guardRefusal, isAnswer } from './hook-rules';
import { readRenderAnswer, type AcceptedHookAnswer } from './render-answer';
import type { RunningHook } from './running-hook';

type Log = (line: string) => void;

export async function answerHook(
  running: RunningHook,
  outcome: HookOutcome,
  log: Log,
): Promise<Json> {
  if (!outcome.ok) return failed(running, outcome.error, log);

  return outcome.answer === undefined
    ? passedOnOrFailed(running, log)
    : answered(running, outcome.answer, log);
}

// Returning nothing after `next` answers what the rest of the chain answered.
function passedOnOrFailed(running: RunningHook, log: Log): Promise<Json> {
  return (
    running.passedOn() ??
    failed(running, 'returned without calling next or answering', log)
  );
}

async function answered(
  running: RunningHook,
  answer: Json,
  log: Log,
): Promise<Json> {
  const valid = await validatedAnswer(running, answer);

  return valid
    ? valid.answer
    : failed(running, 'answered the wrong shape', log);
}

// A failed Hook is skipped, unless it guards: then its event's refusal is the answer.
async function failed(
  running: RunningHook,
  reason: string,
  log: Log,
): Promise<Json> {
  const refusal = running.hook.guard
    ? guardRefusal(running.step.name)
    : undefined;

  log(failureLine(running, reason, refusal !== undefined));

  return refusal ?? skipped(running);
}

// A skipped Hook leaves the event as it came: the chain goes on beneath it, once.
const skipped = (running: RunningHook): Promise<Json> =>
  running.passedOn() ?? running.step.rest(running.step.event);

async function validatedAnswer(
  running: RunningHook,
  answer: Json,
): Promise<AcceptedHookAnswer | null> {
  if (running.step.name === 'ui.render')
    return readRenderAnswer(running, answer);

  return isAnswer(running.step.name, answer) ? { answer } : null;
}
