import { ignoreAttribute, isSkipped } from './skeleton-marks';

// Remembers the author's own aria-hidden (or that there was none) on each element the Skeleton hid.
const previousAttribute = 'data-skeleton-aria';

const absent = 'none';

const ariaHidden = 'aria-hidden';

const containsIgnore = (element: Element): boolean =>
  element.hasAttribute(ignoreAttribute) ||
  element.querySelector(`[${ignoreAttribute}]`) !== null;

function hide(child: Element): void {
  child.setAttribute(
    previousAttribute,
    child.getAttribute(ariaHidden) ?? absent,
  );
  child.setAttribute(ariaHidden, 'true');
}

function hideOnce(child: Element): void {
  if (!child.hasAttribute(previousAttribute)) hide(child);
}

function hideChild(child: Element): void {
  if (isSkipped(child)) return;

  if (containsIgnore(child)) hideFromAssistiveTechnology(child);
  else hideOnce(child);
}

/*
 * aria-hidden cannot be undone further down, so it goes on the highest elements that hold no ignore subtree.
 * An element that holds one stays exposed and its other children are hidden one by one.
 */
export function hideFromAssistiveTechnology(root: Element): void {
  for (const child of root.children) hideChild(child);
}

function restore(element: Element): void {
  const previous = element.getAttribute(previousAttribute);

  if (previous === absent) element.removeAttribute(ariaHidden);
  else if (previous !== null) element.setAttribute(ariaHidden, previous);

  element.removeAttribute(previousAttribute);
}

// Puts back what hideFromAssistiveTechnology changed, including an aria-hidden the author had set.
export function restoreAssistiveTechnology(root: Element): void {
  for (const element of root.querySelectorAll(`[${previousAttribute}]`))
    restore(element);
}
