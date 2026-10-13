import { canPointAt } from './point-hit';

type LineView = 'shown' | 'hidden' | 'cut';
const trailingSpaceWidth = 6;

function lineView(seenEdges: boolean[]): LineView {
  if (seenEdges.every(Boolean)) return 'shown';
  return seenEdges.some(Boolean) ? 'cut' : 'hidden';
}

// How a person sees each drawn line of text: whole, hidden, or cut through by the clamp.
export function lineViews(root: HTMLElement): LineView[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const views: LineView[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const owner = node.parentElement;
    if (!owner || !node.textContent?.trim() || owner.closest('[role=button]'))
      continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const line of range.getClientRects()) {
      // A wrapped line's trailing space hangs past the text edge, where nothing is drawn.
      if (line.width < trailingSpaceWidth) continue;
      const x = line.left + Math.min(4, line.width / 2);
      const seen = [line.top + 1, line.bottom - 1].map((y) =>
        canPointAt(owner, { x, y }),
      );
      views.push(lineView(seen));
    }
  }
  return views;
}
