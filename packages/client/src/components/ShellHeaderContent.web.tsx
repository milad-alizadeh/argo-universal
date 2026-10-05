import { useLayoutEffect, useRef } from 'react';
import type { ShellHeaderContentProps } from './ShellHeaderContent';

export function ShellHeaderContent({
  inset,
  testID,
  children,
}: ShellHeaderContentProps) {
  const element = useRef<HTMLDivElement>(null);
  const previousInset = useRef(inset);
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
      previousInset.current !== inset &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      motion.current = header.animate(
        [
          {
            transform: `translateX(${previousInset.current + currentTranslation - inset}px)`,
          },
          { transform: 'translateX(0px)' },
        ],
        { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }
    previousInset.current = inset;
  }, [inset]);
  useLayoutEffect(() => () => motion.current?.cancel(), []);
  return (
    <div
      ref={element}
      data-testid={testID}
      className="min-w-0 flex-1"
      style={{ marginLeft: inset, willChange: 'transform' }}
    >
      {children}
    </div>
  );
}
