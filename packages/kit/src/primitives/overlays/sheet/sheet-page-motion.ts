import { useCallback, useEffect, useState, type RefObject } from 'react';

export interface LeavingPage {
  name: string | undefined;
  done: () => void;
}

// The page Back has just taken off, kept until its slide ends.
export function useLeavingPage(path: string[]): LeavingPage {
  const [shown, setShown] = useState(path);
  const [leaving, setLeaving] = useState<string>();
  const done = useCallback(() => setLeaving(undefined), []);

  if (shown !== path) {
    setShown(path);
    setLeaving(shown.find((name) => !path.includes(name)));
  }

  return { name: leaving, done };
}

// Waits for the page's slide to finish; with no slide running, as under reduced motion, at once.
export function useSlideEnd(
  ref: RefObject<HTMLDivElement | null>,
  leaving: boolean,
  onEnd: () => void,
): void {
  useEffect(() => {
    const page = ref.current;

    if (!leaving || !page) return;

    return afterAnimations(page, onEnd);
  }, [ref, leaving, onEnd]);
}

function afterAnimations(element: HTMLElement, then: () => void): () => void {
  let live = true;

  const running = element
    .getAnimations()
    .map((animation) => animation.finished);

  void Promise.allSettled(running).then(() => {
    if (live) then();
  });

  return (): void => {
    live = false;
  };
}
