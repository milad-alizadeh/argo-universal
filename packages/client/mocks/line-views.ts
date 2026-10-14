import { canPointAt } from './point-hit';

type LineView = 'shown' | 'hidden' | 'cut';

const trailingSpaceWidth = 6;

function lineView(seenEdges: boolean[]): LineView {
  if (seenEdges.every(Boolean)) return 'shown';

  return seenEdges.some(Boolean) ? 'cut' : 'hidden';
}

export function lineViews(root: HTMLElement): LineView[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const views: LineView[] = [];

  for (let node = walker.nextNode(); node; node = walker.nextNode())
    views.push(...textLineViews(node));

  return views;
}

function textLineViews(node: Node): LineView[] {
  const owner = node.parentElement;

  if (!owner || !hasDrawnText(node, owner)) return [];
  const range = document.createRange();
  range.selectNodeContents(node);

  return [...range.getClientRects()].flatMap((line) =>
    line.width >= trailingSpaceWidth ? [drawnLineView(owner, line)] : [],
  );
}

function hasDrawnText(node: Node, owner: HTMLElement): boolean {
  return Boolean(node.textContent?.trim()) && !owner.closest('[role=button]');
}

function drawnLineView(owner: HTMLElement, line: DOMRect): LineView {
  const x = line.left + Math.min(4, line.width / 2);

  return lineView(
    [line.top + 1, line.bottom - 1].map((y) => canPointAt(owner, { x, y })),
  );
}
