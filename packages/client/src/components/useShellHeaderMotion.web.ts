import { useLayoutEffect, useRef } from 'react';

export function useShellHeaderMotion(
  position: number,
  transitionKey: string,
  animate: boolean,
) {
  const element = useRef<HTMLDivElement>(null);
  const previous = useRef({ position, transitionKey });
  const motion = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const header = element.current;
    if (!header) return;
    const currentTranslation =
      motion.current?.playState === 'running'
        ? new DOMMatrixReadOnly(getComputedStyle(header).transform).m41
        : 0;
    motion.current?.cancel();
    if (
      animate &&
      previous.current.transitionKey !== transitionKey &&
      (previous.current.position !== position || currentTranslation !== 0) &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      motion.current = header.animate(
        [
          {
            transform: `translateX(${previous.current.position + currentTranslation - position}px)`,
          },
          { transform: 'translateX(0px)' },
        ],
        { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }
    previous.current = { position, transitionKey };
  }, [position, transitionKey, animate]);
  useLayoutEffect(() => () => motion.current?.cancel(), []);
  return element;
}
