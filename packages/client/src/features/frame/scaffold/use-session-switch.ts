import { motionDuration } from '@repo/kit/motion';
import { useEffect, useState } from 'react';

/*
 * True from the render that shows another Session until the Frame's motion would have ended. A switch is a new page, not
 * a pane toggle: the new page claims its band and Inspector over the next renders, and none of those changes slides.
 */
export function useSessionSwitch(sessionId: string | undefined): boolean {
  const [settled, setSettled] = useState(sessionId);
  const switching = settled !== sessionId;

  useEffect((): (() => void) | undefined => {
    if (!switching) return undefined;

    const timer = setTimeout(() => setSettled(sessionId), motionDuration.frame);

    return (): void => clearTimeout(timer);
  }, [switching, sessionId]);

  return switching;
}
