import { isDeepStrictEqual } from 'node:util';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { RenderAnswer } from '@repo/contracts/plugins/replaceable';
import type { RunningHook } from './running-hook';

export type AcceptedHookAnswer = { answer: Json };

export async function readRenderAnswer(
  running: RunningHook,
  answer: Json,
): Promise<AcceptedHookAnswer | null> {
  const parsed = RenderAnswer.safeParse(answer).data;

  if (!parsed) return null;

  if ('treePath' in parsed) return retainedAnswer(running, parsed.treePath);

  return forwardedAnswer(running, answer);
}

async function forwardedAnswer(
  running: RunningHook,
  answer: Json,
): Promise<AcceptedHookAnswer | null> {
  return isDeepStrictEqual(await running.passedOn(), answer)
    ? { answer }
    : null;
}

export type RenderedReplacement = { pluginId: string; path: string };

function retainedAnswer(
  running: RunningHook,
  path: string,
): AcceptedHookAnswer {
  const replacement = { pluginId: running.hook.pluginId, path };
  running.step.replacements?.push(replacement);

  return { answer: replacement };
}

export function discardUnusedReplacements(
  replacements: RenderedReplacement[],
  answer: Json,
  discard?: (pluginId: string, path: string) => void,
): void {
  const selected = selectedReplacement(answer);

  for (const { pluginId, path } of replacements.filter(
    (item) => !isSelected(item, selected),
  ))
    discard?.(pluginId, path);
}

function selectedReplacement(answer: Json): RenderedReplacement | null {
  const parsed = RenderAnswer.safeParse(answer).data;

  return parsed && 'pluginId' in parsed ? parsed : null;
}

function isSelected(
  replacement: RenderedReplacement,
  selected: RenderedReplacement | null,
): boolean {
  if (!selected) return false;

  return (
    replacement.pluginId === selected.pluginId &&
    replacement.path === selected.path
  );
}
