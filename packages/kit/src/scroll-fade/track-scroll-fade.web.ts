import { useCallback } from 'react';
import {
  type ScrollFadeEdgeName,
  type ScrollFadeOptions,
  edgeMode,
  fadeEdgesFor,
  scrollFadeRamp,
} from './scroll-fade-options';

interface TrackedEdges {
  start?: ScrollFadeEdgeName;
  end?: ScrollFadeEdgeName;
}

const scrollOffset = (scroll: HTMLElement, horizontal: boolean): number =>
  horizontal ? Math.abs(scroll.scrollLeft) : scroll.scrollTop;

function endDistance(
  scroll: HTMLElement,
  horizontal: boolean,
  offset: number,
): number {
  return horizontal
    ? scroll.scrollWidth - scroll.clientWidth - offset
    : scroll.scrollHeight - scroll.clientHeight - offset;
}

// Each edge's progress as last written, so a scroll that leaves it unchanged writes nothing.
type Written = Map<string, string>;

const progressAt = (distance: number): string =>
  String(Math.max(0, Math.min(1, distance / scrollFadeRamp)));

// A custom property set on the scroller restyles every row inside it, so one left unchanged is not written again.
function write(
  scroll: HTMLElement,
  written: Written,
  [edge, distance]: readonly [ScrollFadeEdgeName, number],
): void {
  const name = `--scroll-fade-${edge}-progress`;
  const progress = progressAt(distance);

  if (written.get(name) === progress) return;

  written.set(name, progress);
  scroll.style.setProperty(name, progress);
}

// Away from both ends both edges stay at 1, so a scroll there costs no restyle.
function updateFade(
  scroll: HTMLElement,
  written: Written,
  { horizontal, start, end }: TrackOptions,
): void {
  const offset = scrollOffset(scroll, horizontal);

  if (start) write(scroll, written, [start, offset]);

  if (end)
    write(scroll, written, [end, endDistance(scroll, horizontal, offset)]);
}

function observeChildren(
  scroll: HTMLElement,
  resize: ResizeObserver,
  update: () => void,
): void {
  resize.disconnect();
  resize.observe(scroll);

  for (const child of scroll.children) resize.observe(child);

  update();
}

function watchContent(
  scroll: HTMLElement,
  update: () => void,
  virtualized: boolean,
): MutationObserver {
  const mutations = new MutationObserver(update);
  // Replacing rows inside a virtualized list leaves its size to the ResizeObserver.
  mutations.observe(scroll, {
    childList: true,
    characterData: !virtualized,
    subtree: !virtualized,
  });

  return mutations;
}

function observeSize(
  scroll: HTMLElement,
  update: () => void,
  virtualized: boolean,
): () => void {
  const resize = new ResizeObserver(update);
  const observe = (): void => observeChildren(scroll, resize, update);
  const mutations = watchContent(scroll, observe, virtualized);
  observe();

  return (): void => {
    resize.disconnect();
    mutations.disconnect();
  };
}

interface TrackOptions extends TrackedEdges {
  horizontal: boolean;
  virtualized: boolean;
}

// The start depends only on the scroll offset. The end also depends on content layout.
function observeTrackedSize(
  scroll: HTMLElement,
  update: () => void,
  { end, virtualized }: TrackOptions,
): (() => void) | undefined {
  if (end) return observeSize(scroll, update, virtualized);

  update();

  return undefined;
}

// Pixel distances keep growing content from restarting a scroll timeline's mask animation.
function trackScrollFade(
  scroll: HTMLElement,
  options: TrackOptions,
): () => void {
  const written: Written = new Map();
  const update = (): void => updateFade(scroll, written, options);
  const stopObserving = observeTrackedSize(scroll, update, options);

  scroll.addEventListener('scroll', update, { passive: true });

  return (): void => {
    stopObserving?.();
    scroll.removeEventListener('scroll', update);
  };
}

type FadeRef = (frame: HTMLDivElement | null) => (() => void) | undefined;

interface FadeTrackingOptions extends Pick<ScrollFadeOptions, 'edges'> {
  horizontal?: boolean;
  virtualized?: boolean;
}

const trackedEdge = (
  edge: ScrollFadeEdgeName,
  edges: ScrollFadeOptions['edges'],
): ScrollFadeEdgeName | undefined =>
  edgeMode(edge, edges) === 'scrolled' ? edge : undefined;

const canTrack = (
  scroll: Element | null | undefined,
  { start, end }: TrackedEdges,
): scroll is HTMLElement =>
  scroll instanceof HTMLElement && Boolean(start ?? end);

function attachFade(
  frame: HTMLDivElement | null,
  options: TrackOptions,
): (() => void) | undefined {
  const scroll = frame?.firstElementChild;

  return canTrack(scroll, options)
    ? trackScrollFade(scroll, options)
    : undefined;
}

export function useTrackScrollFade({
  edges,
  horizontal = false,
  virtualized = false,
}: FadeTrackingOptions): FadeRef {
  const [startEdge, endEdge] = fadeEdgesFor(horizontal);
  const start = trackedEdge(startEdge, edges);
  const end = trackedEdge(endEdge, edges);

  return useCallback(
    (frame: HTMLDivElement | null) =>
      attachFade(frame, { horizontal, virtualized, start, end }),
    [horizontal, virtualized, start, end],
  );
}
