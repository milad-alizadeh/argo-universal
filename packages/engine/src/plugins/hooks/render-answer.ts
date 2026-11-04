import { isDeepStrictEqual } from 'node:util';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { RenderAnswer } from '@repo/contracts/plugins/replaceable';
import type { RegisteredHook } from './hook-registry';
import type { RunningHook } from './running-hook';

export type AcceptedHookAnswer = { answer: Json };

/*
 * A Hook's own tree is named by the Plugin whose Hook drew it, so no Plugin can answer in another's name;
 * any other answer must be what the rest of the chain answered it.
 */
export async function readRenderAnswer(
  running: RunningHook,
  answer: Json,
): Promise<AcceptedHookAnswer | null> {
  const parsed = RenderAnswer.safeParse(answer).data;

  if (!parsed) return null;

  return isOwnTree(parsed)
    ? drawnAnswer(running, parsed.tree)
    : forwardedAnswer(running, answer);
}

// A tree with no Plugin named is the Hook's own; one already named came back from further down the chain.
const isOwnTree = (
  parsed: RenderAnswer,
): parsed is Extract<RenderAnswer, { tree: unknown }> =>
  'tree' in parsed && !('pluginId' in parsed);

async function forwardedAnswer(
  running: RunningHook,
  answer: Json,
): Promise<AcceptedHookAnswer | null> {
  return isDeepStrictEqual(await running.passedOn(), answer)
    ? { answer }
    : null;
}

// A tree a Hook answered with in this chain, and the Hook that drew it.
export type DrawnReplacement = { hook: RegisteredHook; answer: Json };

function drawnAnswer(running: RunningHook, tree: Json): AcceptedHookAnswer {
  const answer = { pluginId: running.hook.pluginId, tree };

  running.step.replacements?.push({ hook: running.hook, answer });

  return { answer };
}

// The Hook whose tree the chain answered with, if any.
export const selectedHook = (
  replacements: DrawnReplacement[],
  answer: Json,
): RegisteredHook | undefined =>
  replacements.find((drawn) => isDeepStrictEqual(drawn.answer, answer))?.hook;
