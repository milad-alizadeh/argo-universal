import { drawnRadius, isDrawnWhole, isInvisible } from './skeleton-classify';
import { isSkipped } from './skeleton-marks';
import type {
  SkeletonMeasure,
  SkeletonPlaceholder,
} from './skeleton-placeholder';
import { skeletonRules as rules } from './skeleton-rules.gen';

interface Scene {
  origin: DOMRect;
  found: SkeletonMeasure;
}

const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE;

const isInkText = (node: Node): node is Text =>
  node.nodeType === Node.TEXT_NODE && (node.nodeValue ?? '').trim() !== '';

function boxPlaceholder(
  rect: DOMRect,
  origin: DOMRect,
  radius: number,
): SkeletonPlaceholder {
  return {
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
    radius,
  };
}

// A bar is part of its line box so lines do not touch, and at least as wide as a dot so a single character is round.
function linePlaceholder(rect: DOMRect, origin: DOMRect): SkeletonPlaceholder {
  const height = rect.height * rules.lineFill;
  const inset = (rect.height - height) / 2;
  const width = Math.max(rect.width, height * rules.minBarWidthPerHeight);
  const left = rect.left - (width - rect.width) / 2;

  return boxPlaceholder(
    new DOMRect(left, rect.top + inset, width, height),
    origin,
    height / 2,
  );
}

const sameLine = (a: DOMRect, b: DOMRect): boolean =>
  Math.abs(a.top - b.top) < 1 && b.left <= a.right + 1;

// A wrapped line can report a second, overlapping box (its trailing space); one line is one bar.
function mergeLines(lines: DOMRect[], rect: DOMRect): DOMRect[] {
  const last = lines.at(-1);

  if (last === undefined || !sameLine(last, rect)) return [...lines, rect];

  const right = Math.max(last.right, rect.right);

  return [
    ...lines.slice(0, -1),
    new DOMRect(last.left, last.top, right - last.left, last.height),
  ];
}

const hasArea = (rect: DOMRect): boolean => rect.width > 0 && rect.height > 0;

function textLines(node: Text, origin: DOMRect): SkeletonPlaceholder[] {
  const range = document.createRange();

  range.selectNodeContents(node);

  return [...range.getClientRects()]
    .filter(hasArea)
    .reduce<DOMRect[]>(mergeLines, [])
    .map((rect) => linePlaceholder(rect, origin));
}

function walkNode(node: Node, parent: Element, scene: Scene): void {
  if (isElement(node)) walkElement(node, scene);
  else if (isInkText(node)) {
    scene.found.placeholders.push(...textLines(node, scene.origin));
    scene.found.ink.push(parent);
  }
}

function walkChildren(parent: Element, scene: Scene): void {
  for (const node of parent.childNodes) walkNode(node, parent, scene);
}

function walkVisible(
  element: Element,
  style: CSSStyleDeclaration,
  scene: Scene,
): void {
  const rect = element.getBoundingClientRect();

  if (!isDrawnWhole(element, style, rect)) {
    walkChildren(element, scene);

    return;
  }

  const radius = drawnRadius(element, rect);

  scene.found.placeholders.push(boxPlaceholder(rect, scene.origin, radius));
  scene.found.hidden.push(element);
}

function walkElement(element: Element, scene: Scene): void {
  if (isSkipped(element)) return;

  const style = getComputedStyle(element);

  if (!isInvisible(style)) walkVisible(element, style, scene);
}

/*
 * What a loading Skeleton draws. It reads the page as the browser laid it out: a text node gives one rect per
 * rendered line, and an image, svg, field or small control gives its own box and corner radius. Cards, rows and
 * separators give none, so they stay as drawn; an ignore element's subtree is skipped whole.
 */
export function measureSkeleton(root: Element): SkeletonMeasure {
  const scene: Scene = {
    origin: root.getBoundingClientRect(),
    found: { placeholders: [], ink: [], hidden: [] },
  };

  walkChildren(root, scene);

  return scene.found;
}
