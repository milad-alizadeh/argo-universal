import type { SkeletonMeasure } from './skeleton-placeholder';

// Marks the walk puts on the page's own elements; clearSkeletonMarks removes every one.
export const inkAttribute = 'data-skeleton-ink';

export const hiddenAttribute = 'data-skeleton-hidden';

export const ignoreAttribute = 'data-skeleton-ignore';

// The drawn placeholders' own container: a Skeleton's walk never reads it.
export const overlayAttribute = 'data-skeleton-overlay';

// A loading Skeleton's wrapper. An outer Skeleton leaves it to draw its own placeholders.
export const rootAttribute = 'data-skeleton-root';

export const isSkipped = (element: Element): boolean =>
  element.hasAttribute(ignoreAttribute) ||
  element.hasAttribute(overlayAttribute) ||
  element.hasAttribute(rootAttribute);

const mark = (elements: Element[], attribute: string): void => {
  for (const element of elements) element.setAttribute(attribute, '');
};

// Hides what the walk found. The marks only change colour and visibility, so the layout is the one measured.
export function markSkeleton(found: SkeletonMeasure): void {
  mark(found.ink, inkAttribute);
  mark(found.hidden, hiddenAttribute);
}

export function clearSkeletonMarks(root: Element): void {
  for (const attribute of [inkAttribute, hiddenAttribute])
    for (const element of root.querySelectorAll(`[${attribute}]`))
      element.removeAttribute(attribute);
}
