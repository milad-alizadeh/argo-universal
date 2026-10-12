import type * as React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { shellTiming } from '../../hooks/use-shell-transition.web';
import type { ShellPaneProps } from './shell-pane';

// Content that keeps its width rides on the pane's moving edge and fades as it narrows, so text slides away whole instead of being wiped.
function slideStyle(
  width: number,
  contentWidth: number,
): { transform: string; opacity: number } {
  const hiddenPart = Math.max(0, contentWidth - width);
  return {
    transform: `translateX(${-hiddenPart}px)`,
    opacity: contentWidth > 0 ? 1 - hiddenPart / contentWidth : 1,
  };
}

export function ShellPane({
  testID,
  width,
  offset,
  contentWidth,
  hidden,
  transitionKey,
  animate = true,
  children,
}: ShellPaneProps): React.JSX.Element {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  // Content that reflows with the pane needs real width; a transform would move it twice.
  const reflows = contentWidth === undefined;
  const motion = useRef<Animation[]>([]);
  const [held, setHeld] = useState({
    width,
    offset,
    contentWidth: contentWidth ?? width,
    transitionKey,
    frameWidth: Math.max(width, contentWidth ?? width),
  });
  const previous = useRef(held);
  const stableContentWidth =
    contentWidth ?? (width > 0 ? width : held.contentWidth);
  // The frame keeps its width until the transition, width or content width changes, so a running slide stays inside it.
  const unchanged =
    held.transitionKey === transitionKey &&
    held.width === width &&
    held.contentWidth === stableContentWidth;
  const frameWidth = unchanged
    ? held.frameWidth
    : Math.max(width, held.width, stableContentWidth);

  if (
    held.width !== width ||
    held.offset !== offset ||
    held.contentWidth !== stableContentWidth ||
    held.transitionKey !== transitionKey
  )
    setHeld({
      width,
      offset,
      contentWidth: stableContentWidth,
      transitionKey,
      frameWidth,
    });

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const last = previous.current;
    const running = motion.current.some(
      (animation) => animation.playState === 'running',
    );
    let currentWidth = last.width;
    let currentOffset = last.offset;
    if (running && reflows && frame.current) {
      const style = getComputedStyle(frame.current);
      currentWidth = Number.parseFloat(style.width);
      currentOffset += new DOMMatrixReadOnly(style.transform).m41;
    } else if (running && slide.current) {
      currentWidth =
        last.contentWidth +
        new DOMMatrixReadOnly(getComputedStyle(slide.current).transform).m41;
      currentOffset += new DOMMatrixReadOnly(
        getComputedStyle(element).transform,
      ).m41;
    }
    for (const animation of motion.current) animation.cancel();
    motion.current = [];
    if (
      animate &&
      last.transitionKey !== transitionKey &&
      (currentWidth !== width || currentOffset !== offset) &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const translation = currentOffset - offset;
      if (reflows && frame.current) {
        motion.current.push(
          frame.current.animate(
            [
              {
                width: `${currentWidth}px`,
                transform: `translateX(${translation}px)`,
              },
              { width: `${width}px`, transform: 'translateX(0px)' },
            ],
            shellTiming,
          ),
        );
      } else {
        if (slide.current)
          motion.current.push(
            slide.current.animate(
              [
                slideStyle(currentWidth, stableContentWidth),
                slideStyle(width, stableContentWidth),
              ],
              shellTiming,
            ),
          );
        if (translation !== 0)
          motion.current.push(
            element.animate(
              [
                { transform: `translateX(${translation}px)` },
                { transform: 'translateX(0px)' },
              ],
              shellTiming,
            ),
          );
      }
    }
    previous.current = {
      width,
      offset,
      contentWidth: stableContentWidth,
      transitionKey,
      frameWidth,
    };
  }, [
    width,
    offset,
    stableContentWidth,
    transitionKey,
    frameWidth,
    animate,
    reflows,
  ]);

  useLayoutEffect(
    () => (): void => {
      for (const animation of motion.current) animation.cancel();
    },
    [],
  );

  return (
    <div
      data-testid={testID}
      className="relative min-w-0 shrink-0"
      style={{ width }}
      aria-hidden={hidden}
      inert={hidden}
    >
      {reflows ? (
        <div
          ref={frame}
          className="absolute bottom-0 left-0 top-0"
          style={{ width, willChange: 'transform, width' }}
        >
          <div
            ref={viewport}
            data-testid={`${testID}-viewport`}
            className="absolute inset-0 overflow-hidden"
          >
            <View testID={`${testID}-content`} className="flex-1 h-full w-full">
              {children}
            </View>
          </div>
        </div>
      ) : (
        <div
          ref={viewport}
          data-testid={`${testID}-viewport`}
          className="absolute bottom-0 left-0 top-0 overflow-hidden"
          style={{ width: frameWidth, willChange: 'transform' }}
        >
          <div
            ref={slide}
            className="h-full"
            style={{
              ...slideStyle(width, stableContentWidth),
              willChange: 'transform, opacity',
            }}
          >
            <View
              testID={`${testID}-content`}
              className="flex-1 h-full"
              style={{ width: stableContentWidth }}
            >
              {children}
            </View>
          </div>
        </div>
      )}
    </div>
  );
}
