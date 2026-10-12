import type * as React from 'react';
import { type RefObject, useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type {
  ScrollFadeEdges,
  ScrollFadeFrameProps,
} from './scroll-fade-frame-view';
import { scrollFadeDepth } from './scroll-fade-overlay';

// The depths and insets the `scroll-fade-mask` class reads; registered as lengths in react-native-web.css, so a depth eases when an edge turns on or off.
type MaskDepths = React.CSSProperties &
  Record<
    | '--scroll-fade-top'
    | '--scroll-fade-bottom'
    | '--scroll-fade-top-inset'
    | '--scroll-fade-bottom-inset',
    string
  >;

// The first scroll element inside the frame, nearest first: the scroll view the frame wraps.
function findScroller(root: HTMLElement): HTMLElement | undefined {
  const queue = [...root.children];
  for (let element = queue.shift(); element; element = queue.shift()) {
    if (!(element instanceof HTMLElement)) continue;
    const { overflowY } = getComputedStyle(element);
    if (overflowY === 'auto' || overflowY === 'scroll') return element;
    queue.push(...element.children);
  }
  return undefined;
}

// Leaves the scroll view's scrollbar out of the mask: a classic scrollbar's own width, measured as it comes and goes; an overlay scrollbar takes none, so the default strip in react-native-web.css keeps it.
function useScrollbarStrip(frame: RefObject<HTMLDivElement | null>): void {
  useLayoutEffect(() => {
    const root = frame.current;
    const scroller = root && findScroller(root);
    if (!root || !scroller) return;
    const measure = (): void => {
      const width = scroller.offsetWidth - scroller.clientWidth;
      if (width > 0) root.style.setProperty('--scroll-fade-bar', `${width}px`);
      else root.style.removeProperty('--scroll-fade-bar');
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return (): void => observer.disconnect();
  }, [frame]);
}

// Around a scroll view: a mask fades its content itself to nothing at each fading edge, and hides it under an inset, but never its scrollbar, so whatever lies behind shows through unchanged.
export function ScrollFadeFrame({
  edges,
  depth,
  inset,
  className,
  style,
  onLayout,
  children,
}: ScrollFadeFrameProps): React.JSX.Element {
  const top = depth?.top ?? scrollFadeDepth.top;
  const bottom = depth?.bottom ?? scrollFadeDepth.bottom;
  const mask: MaskDepths = {
    '--scroll-fade-top': `${edges.top ? top : 0}px`,
    '--scroll-fade-bottom': `${edges.bottom ? bottom : 0}px`,
    '--scroll-fade-top-inset': `${inset?.top ?? 0}px`,
    '--scroll-fade-bottom-inset': `${inset?.bottom ?? 0}px`,
  };
  const frame = useRef<HTMLDivElement>(null);
  useScrollbarStrip(frame);
  return (
    <View
      className={cn('relative', className)}
      style={style}
      onLayout={onLayout}
    >
      <div
        ref={frame}
        className="scroll-fade-mask relative flex min-h-0 flex-auto flex-col"
        style={mask}
      >
        {children}
        {edges.top && (
          <FadingBand edge="top" height={top} inset={inset?.top ?? 0} />
        )}
        {edges.bottom && (
          <FadingBand
            edge="bottom"
            height={bottom}
            inset={inset?.bottom ?? 0}
          />
        )}
      </div>
    </View>
  );
}

// Marks the band the mask fades, where native draws its overlay; it paints nothing.
function FadingBand({
  edge,
  height,
  inset,
}: {
  edge: keyof ScrollFadeEdges;
  height: number;
  inset: number;
}): React.JSX.Element {
  return (
    <div
      aria-hidden
      data-testid={`scroll-fade-${edge}`}
      className="pointer-events-none absolute inset-x-0"
      style={{ height, [edge]: inset }}
    />
  );
}
