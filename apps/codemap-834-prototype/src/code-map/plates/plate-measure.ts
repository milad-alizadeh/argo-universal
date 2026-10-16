import { useLayoutEffect, type RefObject } from 'react';
import type { Insets } from '../labels/map-labels';
import { insetsFrom } from './plate-insets';

type Cover = (insets: Insets) => void;

/** Everything laid over the map: the page's elements beside the Code Map, and its own marked plates. */
function plates(root: HTMLElement): Element[] {
  const siblings = [...(root.parentElement?.children ?? [])].filter(
    (child) => child !== root,
  );

  return [...siblings, ...root.querySelectorAll('[data-plate]')];
}

function measure(root: HTMLElement, cover: Cover): void {
  const rects = plates(root).map((plate) => plate.getBoundingClientRect());
  cover(insetsFrom(root.getBoundingClientRect(), rects));
}

/** Measures on any resize, and again when the page adds or removes a plate. */
function watch(root: HTMLElement, cover: Cover): () => void {
  const resized = new ResizeObserver(() => measure(root, cover));

  const update = (): void => {
    for (const plate of [root, ...plates(root)]) resized.observe(plate);
    measure(root, cover);
  };

  const added = new MutationObserver(update);

  if (root.parentElement)
    added.observe(root.parentElement, { childList: true });
  update();

  return (): void => {
    resized.disconnect();
    added.disconnect();
  };
}

/** Keeps the overlay's bands matched to the plates over the map. */
export function usePlateInsets(
  root: RefObject<HTMLElement | null>,
  cover: Cover,
): void {
  useLayoutEffect(
    () => (root.current ? watch(root.current, cover) : undefined),
    [root, cover],
  );
}
