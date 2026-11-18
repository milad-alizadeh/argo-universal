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

function updateFade(scroll: HTMLElement, horizontal: boolean): void {
  const edges = fadeEdgesFor(horizontal);

  for (const [index, distance] of distances(scroll, horizontal).entries()) {
    const progress = String(
      Math.max(0, Math.min(1, distance / scrollFadeRamp)),
    );

    scroll.style.setProperty(
      `--scroll-fade-${edges[index]}-progress`,
      progress,
    );
  }
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
  const update = (): void => updateFade(scroll, horizontal);
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
