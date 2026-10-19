import { createRef, useLayoutEffect, useRef, useState } from 'react';
import { useCancelOnUnmount } from '../../hooks/use-frame-transition.web';
import type { PaneGeometry } from './pane-geometry';
import { type PaneRefs, syncPaneMotion } from './pane-motion.web';
import type { PaneMode } from './pane-position.web';

function createPaneRefs(): PaneRefs {
  return {
    viewportRef: createRef<HTMLDivElement>(),
    frameRef: createRef<HTMLDivElement>(),
    slideRef: createRef<HTMLDivElement>(),
  };
}

export function usePaneMotion(
  next: PaneGeometry,
  { animate, reflows, timing }: PaneMode,
): PaneRefs {
  const [refs] = useState(createPaneRefs);
  const previous = useRef(next);
  const motion = useRef<Animation[]>([]);
  useCancelOnUnmount(motion);
  useLayoutEffect(() => {
    const mode = { animate, reflows, timing };
    syncPaneMotion({ refs, previous, motion }, next, mode);
  }, [refs, next, animate, reflows, timing]);

  return refs;
}
