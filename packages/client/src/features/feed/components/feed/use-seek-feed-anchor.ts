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
  cursor: number | null | undefined;
  hasOlder: boolean | undefined;
  loadingOlder: boolean;
  requestOlder: () => void;
  open: (found: boolean) => void;
}

interface Asked {
  requested: string | undefined;
  opened: boolean;
  cancelled: boolean;
  frame?: number;
}

const exhausted = (input: SeekInput): boolean => input.hasOlder === false;

const pageKey = (input: SeekInput): string | undefined =>
  input.cursor === undefined ? input.oldest : `cursor:${input.cursor}`;

function requestPage(input: SeekInput, asked: Asked): void {
  const key = pageKey(input);

  if (input.loadingOlder || key === asked.requested) return;

  asked.requested = key;
  input.requestOlder();
}

const available = (asked: Asked): boolean => !asked.opened && !asked.cancelled;

const canAdvance = (input: SeekInput, asked: Asked): boolean =>
  input.shown && available(asked) && !!input.oldest;

const needsPage = (input: SeekInput): boolean =>
  !input.found && !exhausted(input);

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

  if (needsPage(input)) return requestPage(input, asked);

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

function runSeek(next: () => void, current: Asked): () => void {
  next();

  return (): void => cancelPending(current);
}

function useSeekUpdates(input: SeekInput, asked: RefObject<Asked>): void {
  const next = useEffectEvent(() => advance(input, asked.current));

  useEffect(
    () => runSeek(next, asked.current),
    [
      input.shown,
      input.found,
      input.oldest,
      input.cursor,
      input.hasOlder,
      input.loadingOlder,
      asked,
    ],
  );
}

// Request one page at a time until the remembered row is available.
export function useSeekFeedAnchor(input: SeekInput): () => void {
  const asked = useRef<Asked>({
    requested: undefined,
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
