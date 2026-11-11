/*
 * What a reader sees, not the copies a component draws unseen to measure them: an element inside an
 * `aria-hidden` subtree is dropped.
 */
export const seen = (elements: HTMLElement[]): HTMLElement[] =>
  elements.filter(
    (element) => element.closest('[aria-hidden="true"]') === null,
  );
