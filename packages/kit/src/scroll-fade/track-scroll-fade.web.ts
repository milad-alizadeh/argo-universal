import { useCallback } from 'react';
import { fadeEdgesFor, scrollFadeRamp } from './scroll-fade-options';

function distances(
  scroll: HTMLElement,
  horizontal: boolean,
): readonly number[] {
  const [offset, content, viewport] = horizontal
    ? [Math.abs(scroll.scrollLeft), scroll.scrollWidth, scroll.clientWidth]
    : [scroll.scrollTop, scroll.scrollHeight, scroll.clientHeight];

  return [offset, content - viewport - offset];
}

// Each edge's progress as last written, so a scroll that leaves it unchanged writes nothing.
type Written = Map<string, string>;

const progressAt = (distance: number): string =>
  String(Math.max(0, Math.min(1, distance / scrollFadeRamp)));

// A custom property set on the scroller restyles every row inside it, so one left unchanged is not written again.
function write(
  scroll: HTMLElement,
  written: Written,
  [name, progress]: readonly [string, string],
): void {
  if (written.get(name) === progress) return;

  written.set(name, progress);
  scroll.style.setProperty(name, progress);
}

// Away from both ends both edges stay at 1, so a scroll there costs no restyle.
function updateFade(
  scroll: HTMLElement,
  horizontal: boolean,
  written: Written,
): void {
  const edges = fadeEdgesFor(horizontal);

  for (const [index, distance] of distances(scroll, horizontal).entries())
    write(scroll, written, [
      `--scroll-fade-${edges[index]}-progress`,
      progressAt(distance),
    ]);
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
): MutationObserver {
  const mutations = new MutationObserver(update);
  mutations.observe(scroll, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  return mutations;
}

function observeSize(scroll: HTMLElement, update: () => void): () => void {
  const resize = new ResizeObserver(update);
  const observe = (): void => observeChildren(scroll, resize, update);
  const mutations = watchContent(scroll, observe);
  observe();

  return (): void => {
    resize.disconnect();
    mutations.disconnect();
  };
}

// Pixel distances keep growing content from restarting a scroll timeline's mask animation.
function trackScrollFade(scroll: HTMLElement, horizontal: boolean): () => void {
  const written: Written = new Map();
  const update = (): void => updateFade(scroll, horizontal, written);
  const stopObserving = observeSize(scroll, update);
  scroll.addEventListener('scroll', update, { passive: true });

  return (): void => {
    stopObserving();
    scroll.removeEventListener('scroll', update);
  };
}

type FadeRef = (frame: HTMLDivElement | null) => (() => void) | undefined;

export function useTrackScrollFade(horizontal: boolean): FadeRef {
  return useCallback(
    (frame: HTMLDivElement | null): (() => void) | undefined => {
      const scroll = frame?.firstElementChild;

      return scroll instanceof HTMLElement
        ? trackScrollFade(scroll, horizontal)
        : undefined;
    },
    [horizontal],
  );
}
