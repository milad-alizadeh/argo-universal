import type { SkeletonMeasure } from './skeleton-placeholder';

// Marks the walk puts on the page's own elements; clearSkeletonMarks removes every one.
export const inkAttribute = 'data-skeleton-ink';

export const hiddenAttribute = 'data-skeleton-hidden';

export const ignoreAttribute = 'data-skeleton-ignore';

// The drawn placeholders' own container: a Skeleton's walk never reads it.
export const overlayAttribute = 'data-skeleton-overlay';

export const ariaHiddenAttribute = 'data-skeleton-aria';

export const isSkipped = (element: Element): boolean =>
  element.hasAttribute(ignoreAttribute) ||
  element.hasAttribute(overlayAttribute);

const mark = (elements: Element[], attribute: string): void => {
  for (const element of elements) element.setAttribute(attribute, '');
};

// Hides what the walk found. The marks only change colour and visibility, so the layout is the one measured.
export function markSkeleton(found: SkeletonMeasure): void {
  mark(found.ink, inkAttribute);
  mark(found.hidden, hiddenAttribute);
}

function removeMark(root: Element, attribute: string): void {
  for (const element of root.querySelectorAll(`[${attribute}]`))
    element.removeAttribute(attribute);
}

export function clearSkeletonMarks(root: Element): void {
  removeMark(root, inkAttribute);
  removeMark(root, hiddenAttribute);

  for (const element of root.querySelectorAll(`[${ariaHiddenAttribute}]`)) {
    element.removeAttribute(ariaHiddenAttribute);
    element.removeAttribute('aria-hidden');
  }
}

const containsIgnore = (element: Element): boolean =>
  element.hasAttribute(ignoreAttribute) ||
  element.querySelector(`[${ignoreAttribute}]`) !== null;

function hideChild(child: Element): void {
  if (isSkipped(child)) return;

  if (containsIgnore(child)) hideFromAssistiveTechnology(child);
  else {
    child.setAttribute('aria-hidden', 'true');
    child.setAttribute(ariaHiddenAttribute, '');
  }
}

/*
 * aria-hidden cannot be undone further down, so it goes on the highest elements that hold no ignore subtree.
 * An element that holds one stays exposed and its other children are hidden one by one.
 */
export function hideFromAssistiveTechnology(root: Element): void {
  for (const child of root.children) hideChild(child);
}
