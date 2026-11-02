import {
  type RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
} from 'react';
import { inputGuard } from './use-restore-feed-anchor';

interface SeekInput {
  shown: boolean;
  found: boolean;
  oldest: string | undefined;
  hasOlder: boolean | undefined;
  loadingOlder: boolean;
  requestOlder: () => void;
  open: (found: boolean) => void;
}

interface Asked {
  oldest: string | undefined;
  pages: number;
  opened: boolean;
  cancelled: boolean;
  frame?: number;
}

const maxRestorePages = 100;

const exhausted = (input: SeekInput, asked: Asked): boolean =>
  input.hasOlder === false || asked.pages >= maxRestorePages;

function requestPage(input: SeekInput, asked: Asked): void {
  if (input.loadingOlder || input.oldest === asked.oldest) return;

  asked.oldest = input.oldest;
  asked.pages += 1;
  input.requestOlder();
}

const available = (asked: Asked): boolean => !asked.opened && !asked.cancelled;

const canAdvance = (input: SeekInput, asked: Asked): boolean =>
  input.shown && available(asked) && !!input.oldest;

const needsPage = (input: SeekInput, asked: Asked): boolean =>
  !input.found && !exhausted(input, asked);

function scheduleFrame(input: SeekInput, asked: Asked): void {
  asked.frame = requestAnimationFrame(() => {
    asked.frame = undefined;
    input.open(input.found);
  });
}

function scheduleOpen(input: SeekInput, asked: Asked): void {
  asked.opened = true;

  scheduleFrame(input, asked);
}

function advance(input: SeekInput, asked: Asked): void {
  if (!canAdvance(input, asked)) return;

  if (needsPage(input, asked)) return requestPage(input, asked);

  scheduleOpen(input, asked);
}

function cancelPending(asked: Asked): void {
  if (asked.frame === undefined) return;

  cancelAnimationFrame(asked.frame);
  asked.frame = undefined;
  asked.opened = false;
}

function useInputGuard(shown: boolean, cancel: () => void): void {
  useEffect(() => {
    if (!shown) return;

    return inputGuard(cancel);
  }, [shown, cancel]);
}

function useSeekUpdates(input: SeekInput, asked: RefObject<Asked>): void {
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
    asked,
  ]);
}

// Load a bounded amount of history before asking the list to show an older row.
export function useSeekFeedAnchor(input: SeekInput): () => void {
  const asked = useRef<Asked>({
    oldest: undefined,
    pages: 0,
    opened: false,
    cancelled: false,
  });

  const cancel = useCallback(() => {
    asked.current.cancelled = true;
    cancelPending(asked.current);
  }, []);

  useInputGuard(input.shown, cancel);

  useSeekUpdates(input, asked);

  return cancel;
}
