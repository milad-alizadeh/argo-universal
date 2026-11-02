import { useEffect, useEffectEvent, useRef } from 'react';

interface SeekInput {
  shown: boolean;
  found: boolean;
  oldest: string | undefined;
  hasOlder: boolean | undefined;
  loadingOlder: boolean;
  requestOlder: () => void;
  open: (found: boolean) => void;
  settle: () => void;
}

interface Asked {
  oldest: string | undefined;
  pages: number;
  opened: boolean;
  frame?: number;
  fallback?: ReturnType<typeof setTimeout>;
  settle?: ReturnType<typeof setTimeout>;
}

const maxRestorePages = 100;

const settleHistoryMs = 1000;

const settleLayoutMs = 300;

const exhausted = (input: SeekInput, asked: Asked): boolean =>
  input.hasOlder === false || asked.pages >= maxRestorePages;

function requestPage(input: SeekInput, asked: Asked): void {
  if (input.loadingOlder || input.oldest === asked.oldest) return;

  asked.oldest = input.oldest;
  asked.pages += 1;
  input.requestOlder();
}

const canAdvance = (input: SeekInput, asked: Asked): boolean =>
  input.shown && !asked.opened && !!input.oldest;

const needsPage = (input: SeekInput, asked: Asked): boolean =>
  !input.found && !exhausted(input, asked);

function scheduleFallback(input: SeekInput, asked: Asked): void {
  asked.fallback = setTimeout(() => {
    asked.fallback = undefined;
    input.open(false);
  }, settleHistoryMs);
}

function scheduleFrame(input: SeekInput, asked: Asked): void {
  asked.frame = requestAnimationFrame(() => {
    asked.frame = undefined;
    input.open(true);
    asked.settle = setTimeout(() => {
      asked.settle = undefined;
      input.settle();
    }, settleLayoutMs);
  });
}

function scheduleOpen(input: SeekInput, asked: Asked): void {
  asked.opened = true;

  if (input.found) scheduleFrame(input, asked);
  else scheduleFallback(input, asked);
}

function advance(input: SeekInput, asked: Asked): void {
  if (!canAdvance(input, asked)) return;

  if (needsPage(input, asked)) return requestPage(input, asked);

  scheduleOpen(input, asked);
}

function cancelPending(asked: Asked): void {
  clearTimeout(asked.settle);
  asked.settle = undefined;

  if (asked.fallback !== undefined) {
    clearTimeout(asked.fallback);
    asked.fallback = undefined;
    asked.opened = false;
  }

  if (asked.frame === undefined) return;

  cancelAnimationFrame(asked.frame);
  asked.frame = undefined;
  asked.opened = false;
}

// Load a bounded amount of history before asking the list to show an older row.
export function useSeekFeedAnchor(input: SeekInput): void {
  const asked = useRef<Asked>({ oldest: undefined, pages: 0, opened: false });
  const next = useEffectEvent(() => advance(input, asked.current));

  useEffect(() => {
    const current = asked.current;

    next();

    return (): void => cancelPending(current);
  }, [
    input.shown,
    input.found,
    input.oldest,
    input.hasOlder,
    input.loadingOlder,
  ]);
}
