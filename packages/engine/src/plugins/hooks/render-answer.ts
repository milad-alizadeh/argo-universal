import { isDeepStrictEqual } from 'node:util';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { RenderAnswer } from '@repo/contracts/plugins/replaceable';
import type { RunningHook } from './running-hook';

export async function readRenderAnswer(
  running: RunningHook,
  answer: Json,
): Promise<Json | null> {
  const parsed = RenderAnswer.safeParse(answer).data;

  if (!parsed) return null;

  if ('treePath' in parsed)
    return { pluginId: running.hook.pluginId, path: parsed.treePath };

  return forwardedAnswer(running, answer);
}

async function forwardedAnswer(
  running: RunningHook,
  answer: Json,
): Promise<Json | null> {
  return isDeepStrictEqual(await running.passedOn(), answer) ? answer : null;
}
