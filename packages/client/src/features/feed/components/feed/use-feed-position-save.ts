import { LiteThrottler } from '@tanstack/pacer-lite';
import { useCallback, useEffect, useMemo, useRef } from 'react';

// A scroll event comes every frame; a few saves a second keep the read position close enough.
const positionSaveWait = 250;

/*
 * Returns the scroll handler. It saves at once, then at most every `positionSaveWait` ms, and once more after the
 * last event. Blurring or unmounting saves what is pending for the same Session; a different Session drops it,
 * since the list now shows another Feed.
 */
export function useFeedPositionSave(
  sessionId: string | undefined,
  focused: boolean,
  save: (sessionId: string | undefined) => void,
): () => void {
  const throttler = useMemo(
    () =>
      new LiteThrottler(() => save(sessionId), {
        wait: positionSaveWait,
        leading: true,
        trailing: true,
      }),
    [save, sessionId],
  );

  const latest = useRef(throttler);

  useEffect(() => {
    latest.current = throttler;
  });

  // Declared first, so on unmount it saves before the next cleanup drops what is left.
  useEffect(
    () => (): void => {
      latest.current.flush();
    },
    [],
  );
  useEffect(() => (): void => throttler.cancel(), [throttler]);
  useEffect(() => {
    if (!focused) throttler.flush();
  }, [focused, throttler]);

  return useCallback((): void => {
    if (focused) throttler.maybeExecute();
  }, [focused, throttler]);
}
