import { useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
import type { ShellPaneProps } from './ShellPane';

const timing = { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

export function ShellPane({
  testID,
  width,
  offset,
  contentWidth,
  hidden,
  transitionKey,
  animate = true,
  card,
  header,
  children,
}: ShellPaneProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  // Content that reflows with the pane needs real width; a transform would move it twice.
  const reflows = contentWidth === undefined;
  const surface = useRef<HTMLDivElement>(null);
  const motion = useRef<Animation[]>([]);
  const previous = useRef({
    width,
    offset,
    contentWidth: contentWidth ?? width,
    transitionKey,
    frameWidth: Math.max(width, contentWidth ?? width),
  });
  const stableContentWidth =
    contentWidth ?? (width > 0 ? width : previous.current.contentWidth);
  // The frame keeps its width until the transition, width or content width changes, so a running animation's clip holds.
  const unchanged =
    previous.current.transitionKey === transitionKey &&
    previous.current.width === width &&
    previous.current.contentWidth === stableContentWidth;
  const frameWidth = unchanged
    ? previous.current.frameWidth
    : Math.max(width, previous.current.width, stableContentWidth);
  const surfaceWidth = Math.max(
    1,
    width || previous.current.width || stableContentWidth,
  );

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
    } else if (running) {
      const style = getComputedStyle(element);
      currentWidth =
        last.frameWidth -
        Number.parseFloat(
          style.clipPath.match(/inset\(0px ([\d.]+)px/)?.[1] ?? '0',
        );
      currentOffset += new DOMMatrixReadOnly(style.transform).m41;
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
            timing,
          ),
        );
      } else {
        motion.current.push(
          element.animate(
            [
              {
                transform: `translateX(${translation}px)`,
                clipPath: `inset(0 ${Math.max(0, frameWidth - currentWidth)}px 0 0)`,
              },
              {
                transform: 'translateX(0px)',
                clipPath: `inset(0 ${Math.max(0, frameWidth - width)}px 0 0)`,
              },
            ],
            timing,
          ),
        );
        if (surface.current) {
          motion.current.push(
            surface.current.animate(
              [
                {
                  transform: `translateX(${translation}px) scaleX(${currentWidth / surfaceWidth})`,
                },
                {
                  transform: `translateX(0px) scaleX(${width / surfaceWidth})`,
                },
              ],
              timing,
            ),
          );
        }
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
    surfaceWidth,
    animate,
    reflows,
  ]);

  useLayoutEffect(
    () => () => {
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
          {card && (
            <div
              className="absolute bottom-0 left-0 right-0 top-shell-bar rounded-xl bg-card shadow-card"
              style={{ pointerEvents: 'none' }}
            />
          )}
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
        <>
          {card && (
            <div
              ref={surface}
              className="absolute bottom-0 left-0 top-shell-bar rounded-xl bg-card shadow-card"
              style={{
                width: surfaceWidth,
                transformOrigin: 'left center',
                transform: `scaleX(${width / surfaceWidth})`,
                willChange: 'transform',
                pointerEvents: 'none',
              }}
            />
          )}
          <div
            ref={viewport}
            data-testid={`${testID}-viewport`}
            className="absolute bottom-0 left-0 top-0 overflow-hidden"
            style={{
              width: frameWidth,
              clipPath: `inset(0 ${Math.max(0, frameWidth - width)}px 0 0)`,
              willChange: 'transform, clip-path',
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
        </>
      )}
      {header && (
        <div
          className="absolute left-0 right-0 top-0 h-shell-bar"
          style={{ visibility: hidden ? 'hidden' : 'visible' }}
        >
          {header}
        </div>
      )}
    </div>
  );
}
