import { skeletonRules as rules } from './skeleton-rules.gen';

const transparentEndings = [', 0)', '/ 0)'];

const pixels = (value: string): number => Number.parseFloat(value) || 0;

function radiusOf(style: CSSStyleDeclaration, rect: DOMRect): number {
  const limit = Math.min(rect.width, rect.height) / 2;

  return Math.min(pixels(style.borderTopLeftRadius), limit);
}

const sameSize = (a: DOMRect, b: DOMRect): boolean =>
  Math.abs(a.width - b.width) < rules.sameSizeTolerance &&
  Math.abs(a.height - b.height) < rules.sameSizeTolerance;

const sameSizeChild = (element: Element, rect: DOMRect): Element | null => {
  const child = element.firstElementChild;

  return child !== null && sameSize(child.getBoundingClientRect(), rect)
    ? child
    : null;
};

// The element's own radius, or the one a child of the same size gives it (an avatar's clipped image or fill).
function inheritedRadius(element: Element, rect: DOMRect): number {
  const own = radiusOf(getComputedStyle(element), rect);
  const child = sameSizeChild(element, rect);

  return own > 0 || child === null ? own : inheritedRadius(child, rect);
}

const isGlyph = (element: Element): boolean =>
  rules.glyphTags.has(element.tagName.toUpperCase()) ||
  rules.glyphRoles.has(element.getAttribute('role') ?? '');

const fitsSmallControl = (rect: DOMRect): boolean =>
  rect.height <= rules.smallControlHeight &&
  rect.width <= rules.smallControlWidth;

const isSquareGlyph = (
  element: Element,
  rect: DOMRect,
  radius: number,
): boolean => radius === 0 && isGlyph(element) && fitsSmallControl(rect);

/*
 * The radius a whole-drawn element's placeholder takes: its own or its same-size child's, and a small icon with
 * none is round, as the other two platforms draw it.
 */
export function drawnRadius(element: Element, rect: DOMRect): number {
  const radius = inheritedRadius(element, rect);

  return isSquareGlyph(element, rect, radius)
    ? Math.min(rect.width, rect.height) / 2
    : radius;
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
  rules.atomicTags.has(element.tagName.toUpperCase()) ||
  rules.atomicRoles.has(element.getAttribute('role') ?? '');

const hasBorder = (style: CSSStyleDeclaration): boolean =>
  pixels(style.borderTopWidth) > 0 &&
  style.borderTopStyle !== 'none' &&
  !isTransparent(style.borderTopColor);

const isFilledOrOutlined = (style: CSSStyleDeclaration): boolean =>
  hasFill(style) || hasBorder(style);

// A small control drawn as a rounded box, filled or outlined (a button, a pill): one placeholder, whatever it holds.
const isSmallControl = (style: CSSStyleDeclaration, rect: DOMRect): boolean =>
  isFilledOrOutlined(style) &&
  radiusOf(style, rect) > 0 &&
  fitsSmallControl(rect);

const isEmpty = (element: Element): boolean =>
  element.childElementCount === 0 && (element.textContent ?? '').trim() === '';

// A small filled box with nothing inside it: a dot, a switch track, a bar of a chart. A big one is a background.
const isEmptyFill = (
  element: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect,
): boolean => isSmallBox(style, rect) && isEmpty(element);

const isSmallBox = (style: CSSStyleDeclaration, rect: DOMRect): boolean =>
  hasFill(style) &&
  fitsSmallControl(rect) &&
  Math.min(rect.width, rect.height) > rules.hairline;

// A vector too big to be an icon is decoration (a scroll fade): it stays drawn.
const isDecoration = (element: Element, rect: DOMRect): boolean =>
  rules.vectorTags.has(element.tagName.toUpperCase()) &&
  !fitsSmallControl(rect);

const isDrawnMedia = (element: Element, rect: DOMRect): boolean =>
  isMedia(element) && !isDecoration(element, rect);

// True for what one placeholder covers whole instead of being walked into.
export const isDrawnWhole = (
  element: Element,
  style: CSSStyleDeclaration,
  rect: DOMRect,
): boolean =>
  isDrawnMedia(element, rect) ||
  isSmallControl(style, rect) ||
  isEmptyFill(element, style, rect);
