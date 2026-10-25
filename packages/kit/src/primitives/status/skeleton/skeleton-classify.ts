// Elements that draw themselves with no text node to measure: one placeholder each.
const mediaTags = new Set([
  'IMG',
  'SVG',
  'CANVAS',
  'VIDEO',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'PROGRESS',
  'METER',
]);

const controlRoles = new Set([
  'switch',
  'checkbox',
  'radio',
  'slider',
  'progressbar',
  'img',
]);

const transparentEndings = [', 0)', '/ 0)'];

// A fill thinner than this is a separator, which stays drawn.
const hairline = 2;

// A capsule or disc up to this size is a pill, avatar or small control: one placeholder for the whole of it.
const smallControlHeight = 40;

const smallControlWidth = 240;

const pixels = (value: string): number => Number.parseFloat(value) || 0;

export function radiusOf(style: CSSStyleDeclaration, rect: DOMRect): number {
  const limit = Math.min(rect.width, rect.height) / 2;

  return Math.min(pixels(style.borderTopLeftRadius), limit);
}

const sameSize = (a: DOMRect, b: DOMRect): boolean =>
  Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2;

const sameSizeChild = (element: Element, rect: DOMRect): Element | null => {
  const child = element.firstElementChild;

  return child !== null && sameSize(child.getBoundingClientRect(), rect)
    ? child
    : null;
};

// The element's own radius, or the one a child of the same size gives it (an avatar's clipped image or fill).
export function drawnRadius(element: Element, rect: DOMRect): number {
  const own = radiusOf(getComputedStyle(element), rect);
  const child = sameSizeChild(element, rect);

  return own > 0 || child === null ? own : drawnRadius(child, rect);
}

const isTransparent = (colour: string): boolean =>
  colour === 'transparent' ||
  transparentEndings.some((ending) => colour.endsWith(ending));

const hasFill = (style: CSSStyleDeclaration): boolean =>
  !isTransparent(style.backgroundColor) || style.backgroundImage !== 'none';

export const isInvisible = (style: CSSStyleDeclaration): boolean =>
  style.display === 'none' ||
  style.visibility === 'hidden' ||
  style.opacity === '0';

const isMedia = (element: Element): boolean =>
  mediaTags.has(element.tagName.toUpperCase()) ||
  controlRoles.has(element.getAttribute('role') ?? '');

const fitsSmallControl = (rect: DOMRect): boolean =>
  rect.height <= smallControlHeight && rect.width <= smallControlWidth;

const isRound = (style: CSSStyleDeclaration, rect: DOMRect): boolean =>
  radiusOf(style, rect) >= Math.min(rect.width, rect.height) / 2 - 1;

const isSmallCapsule = (style: CSSStyleDeclaration, rect: DOMRect): boolean =>
  hasFill(style) && isRound(style, rect) && fitsSmallControl(rect);

const isEmpty = (element: Element): boolean =>
  element.childElementCount === 0 && (element.textContent ?? '').trim() === '';

// A filled box with nothing inside it: a dot, a switch track, a bar of a chart.
const isEmptyFill = (
  element: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect,
): boolean =>
  hasFill(style) &&
  isEmpty(element) &&
  Math.min(rect.width, rect.height) > hairline;

// True for what one placeholder covers whole instead of being walked into.
export const isDrawnWhole = (
  element: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect,
): boolean =>
  isMedia(element) ||
  isSmallCapsule(style, rect) ||
  isEmptyFill(element, style, rect);
