import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useTRPC } from '#features/connection';
import { useScreenFocused } from '#lib/product/navigation/navigation';

function subscribeAppState(changed: () => void): () => void {
  const subscription = AppState.addEventListener('change', changed);

  return (): void => subscription.remove();
}

// A backgrounded App or hidden browser tab shows nothing, so it sees nothing. Unlike notifications, focus does not count: a visible, unfocused window still shows the Feed.
const appShown = (): boolean => AppState.currentState === 'active';

const useAppShown = (): boolean =>
  useSyncExternalStore(subscribeAppState, appShown);

// A refused call, such as while the Engine restarts, tries again with backoff; raising the seen revision twice is harmless.
const markSeenRetries = 3;

// Sends each newer revision seen, one call at a time: while text streams, the latest revision goes when the last call settles.
function useMarksSeenRevision(sessionId: string, seenRevision: number): void {
  const trpc = useTRPC();

  const { mutate, isPending } = useMutation(
    trpc.session.markSeen.mutationOptions({ retry: markSeenRetries }),
  );

  const sentRevision = useRef(0);

  useEffect(() => {
    if (isPending || seenRevision <= sentRevision.current) return;
    sentRevision.current = seenRevision;
    mutate({ sessionId, revision: seenRevision });
  }, [isPending, seenRevision, sessionId, mutate]);
}

// Only the focused page shows its Feed: not iOS's long-press preview, nor the page Link preloads behind it while the preview is open.
function usePageShown(preview: boolean): boolean {
  const focused = useScreenFocused();
  const appShown = useAppShown();

  return focused && appShown && !preview;
}

// Marks the Session seen up to the newest revision held while the Feed's end is on screen. Returns the Feed's `onAtEndChange`.
export function useMarkSeen(
  sessionId: string,
  revision: number,
  preview: boolean,
): (atEnd: boolean) => void {
  const [atEnd, setAtEnd] = useState(false);
  const shown = usePageShown(preview);
  useMarksSeenRevision(sessionId, atEnd && shown ? revision : 0);

  return setAtEnd;
}
