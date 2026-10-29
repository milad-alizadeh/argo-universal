import { isDeepStrictEqual } from 'node:util';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { RenderAnswer } from '@repo/contracts/plugins/replaceable';
import type { RegisteredHook } from './hook-registry';
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

type RenderedReplacement = { pluginId: string; path: string };

// A tree a Hook answered with in this chain, and the Hook that answered it.
export type RetainedReplacement = RenderedReplacement & {
  hook: RegisteredHook;
};

function retainedAnswer(
  running: RunningHook,
  path: string,
): AcceptedHookAnswer {
  const replacement = { pluginId: running.hook.pluginId, path };
  running.step.replacements?.push({ ...replacement, hook: running.hook });

  return { answer: replacement };
}

export function discardUnusedReplacements(
  replacements: RetainedReplacement[],
  answer: Json,
  discard?: (pluginId: string, path: string) => void,
): void {
  const selected = selectedReplacement(answer);

  for (const { pluginId, path } of replacements.filter(
    (item) => !isSelected(item, selected),
  ))
    discard?.(pluginId, path);
}

// The Hook whose tree the chain answered with, if any.
export function selectedHook(
  replacements: RetainedReplacement[],
  answer: Json,
): RegisteredHook | undefined {
  const selected = selectedReplacement(answer);

  return replacements.find((item) => isSelected(item, selected))?.hook;
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
