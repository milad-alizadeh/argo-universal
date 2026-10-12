import { $createCodeNode, $isCodeNode, type CodeNode } from '@lexical/code';
import { $isListItemNode } from '@lexical/list';
import { $isQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $createPoint,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  type LexicalNode,
  type RangeSelection,
} from 'lexical';
import type { ReturnPlace } from './rich-textarea-return';

function $moveIntoCodeBlock(selection: RangeSelection): void {
  const text = selection.getTextContent();
  selection.insertNodes([$createCodeNode()]);
  const inCodeBlock = $getSelection();
  if ($isRangeSelection(inCodeBlock)) inCodeBlock.insertRawText(text);
}

// The selected text moves into one code block; with nothing selected, the caret's line becomes one.
export function $wrapInCodeBlock(): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  if (selection.isCollapsed())
    $setBlocksType(selection, () => $createCodeNode());
  else $moveIntoCodeBlock(selection);
}

function $caretAtEnd(code: CodeNode, selection: RangeSelection): boolean {
  const end = $createPoint(code.getKey(), code.getChildrenSize(), 'element');
  return selection.isCollapsed() && selection.anchor.is(end);
}

// Lexical's own test for leaving a code block: the caret ends it after two empty lines.
function $endsAfterTwoEmptyLines(
  code: CodeNode,
  selection: RangeSelection,
): boolean {
  const lastTwo = code.getChildren().slice(-2);
  return (
    $caretAtEnd(code, selection) &&
    lastTwo.length === 2 &&
    lastTwo.every($isLineBreakNode)
  );
}

function $listItemPlace(caret: LexicalNode): ReturnPlace | undefined {
  const item = [caret, ...caret.getParents()].find($isListItemNode);
  return item && { block: 'list-item', empty: item.getTextContentSize() === 0 };
}

function $blockPlace(
  block: LexicalNode,
  selection: RangeSelection,
): ReturnPlace {
  if ($isCodeNode(block))
    return {
      block: 'code-block',
      empty: $endsAfterTwoEmptyLines(block, selection),
    };
  return {
    block: $isQuoteNode(block) ? 'quote' : 'paragraph',
    empty: block.getTextContentSize() === 0,
  };
}

// The block the caret is in, for the Return decision.
export function $returnPlace(selection: RangeSelection): ReturnPlace {
  const caret = selection.anchor.getNode();
  return (
    $listItemPlace(caret) ??
    $blockPlace(caret.getTopLevelElement() ?? caret, selection)
  );
}
