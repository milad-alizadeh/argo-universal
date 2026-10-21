import { $createCodeNode, $isCodeNode } from '@lexical/code';
import { $isListItemNode } from '@lexical/list';
import { $isQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $getSelection,
  $isRangeSelection,
  type LexicalNode,
  type RangeSelection,
} from 'lexical';
import type { ReturnBlock } from '../rich-textarea-return';
import { $closest } from './rich-textarea-selection';

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

function $blockKind(block: LexicalNode): ReturnBlock {
  if ($isCodeNode(block)) return 'code-block';

  return $isQuoteNode(block) ? 'quote' : 'paragraph';
}

// The block the caret is in, for the Return decision.
export function $returnBlock(selection: RangeSelection): ReturnBlock {
  const caret = selection.anchor.getNode();

  if ($closest(caret, $isListItemNode)) return 'list-item';

  return $blockKind(caret.getTopLevelElement() ?? caret);
}
