import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useEffect, useState } from 'react';
import { useSizeClassValue } from '../use-size-class/use-size-class-value';
import type { ScrollFadeListProps } from './scroll-fade-list-props';

export interface FrameSize {
  className?: string;
  style?: { height: number; maxHeight: number };
}

export type FrameCaps = Pick<
  ScrollFadeListProps<unknown>,
  'maxHeight' | 'fitHeight'
>;

const sizeSignals = ['totalSize', 'headerSize', 'footerSize'] as const;

// Reports the list's content length now and whenever it changes; returns how to stop.
function followContentLength(
  list: LegendListRef,
  report: (length: number) => void,
): () => void {
  const update = (): void => report(list.getState().contentLength);
  update();
  const stops = sizeSignals.map((size) => list.getState().listen(size, update));

  return (): void => {
    for (const stop of stops) stop();
  };
}

// The list's content length, followed only while capped: Legend List's web build never calls onContentSizeChange.
function useContentLength(
  list: RefObject<LegendListRef | null>,
  follow: boolean,
): number | undefined {
  const [length, setLength] = useState<number>();
  useEffect(() => {
    if (!follow || !list.current) return;

    return followContentLength(list.current, setLength);
  }, [list, follow]);

  return length;
}

/*
 * As tall as the content, up to the cap for the window's size class, in a parent that grows with it;
 * with no cap the frame fills its parent. A bounded parent's free space still goes to the frame: iOS
 * insets the content under a see-through header, which a content-tall frame would cut off.
 * The content's length is a height, not a flex basis: in a phone sheet, whose React Native content
 * is hosted at its own size (RNHostView `matchContents`), Yoga gave a frame sized by its basis no
 * height at all, so a fitted List in a PopoverContent drew nothing. Only a frame fitting the room it
 * was offered gives that height back to a parent holding less: a frame held to a `maxHeight` keeps
 * it, because the parent sizing itself by the frame's own content has none of its own to hold it to.
 */
export function useFrameSize(
  list: RefObject<LegendListRef | null>,
  caps: FrameCaps,
): FrameSize {
  const held = useSizeClassValue(caps.maxHeight);
  const offered = useSizeClassValue(caps.fitHeight);
  const cap = held ?? offered;
  const length = useContentLength(list, cap !== undefined);

  if (cap === undefined) return { className: 'min-h-0 flex-1' };

  return cappedFrame(cap, length, held === undefined);
}

const cappedFrame = (
  cap: number,
  length: number | undefined,
  shrinks: boolean,
): FrameSize => ({
  className: shrinks ? 'min-h-0 shrink grow' : 'min-h-0 grow',
  style: { height: Math.min(length ?? cap, cap), maxHeight: cap },
});
