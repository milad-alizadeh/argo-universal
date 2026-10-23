import {
  $getSelection,
  $isRangeSelection,
  type LexicalNode,
  type RangeSelection,
} from 'lexical';

// The text selection, when it is a caret (collapsed) or a stretch of text (not collapsed).
export function $rangeSelection({
  collapsed,
}: {
  collapsed: boolean;
}): RangeSelection | undefined {
  const selection = $getSelection();

  return $isRangeSelection(selection) && selection.isCollapsed() === collapsed
    ? selection
    : undefined;
}

// The node itself or its nearest ancestor of a kind.
export function $closest<T extends LexicalNode>(
  node: LexicalNode,
  isKind: (candidate: LexicalNode) => candidate is T,
): T | undefined {
  return [node, ...node.getParents()].find(isKind);
}
