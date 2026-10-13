import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { $createQuoteNode, $isQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type ElementNode,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
} from 'lexical';
import { type MarkdownMark, markdownMarks } from '#lib/generic/markdown-marks';
import { OPEN_LINK_EDITOR_COMMAND } from './rich-textarea-link-editing';
import { $closest } from './rich-textarea-selection';

// What the format bar applies: a mark markdown writes, a link, or a block.
export type BlockFormat = 'bullet' | 'number' | 'quote';

export type Format = MarkdownMark | 'link' | BlockFormat;

function isMarkFormat(format: Format): format is MarkdownMark {
  return markdownMarks.some((mark) => mark === format);
}

function $listFormat(node: LexicalNode): BlockFormat | undefined {
  const list = $closest(node, $isListNode);

  return list && (list.getListType() === 'number' ? 'number' : 'bullet');
}

function $blockFormat(selection: RangeSelection): BlockFormat | undefined {
  const anchor = selection.anchor.getNode();
  const quoted = $isQuoteNode(anchor.getTopLevelElement());

  return $listFormat(anchor) ?? (quoted ? 'quote' : undefined);
}

// The marks and the block the selection already has, which the format bar shows pressed.
export function $appliedFormats(selection: RangeSelection): Format[] {
  const marks = markdownMarks.filter((mark) => selection.hasFormat(mark));
  const block = $blockFormat(selection);

  return block ? [...marks, block] : marks;
}

function $setBlocks(createBlock: () => ElementNode): void {
  const selection = $getSelection();

  if ($isRangeSelection(selection)) $setBlocksType(selection, createBlock);
}

// A block is made as its markdown makes it: lists through Lexical's list commands.
const makeBlock: Record<BlockFormat, (editor: LexicalEditor) => void> = {
  bullet: (editor) => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND),
  number: (editor) => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND),
  quote: (editor) => editor.update(() => $setBlocks($createQuoteNode)),
};

// A block the selection already has turns back into plain paragraphs.
function toggleBlock(
  editor: LexicalEditor,
  { format, applied }: { format: BlockFormat; applied: boolean },
): void {
  if (applied) editor.update(() => $setBlocks($createParagraphNode));
  else makeBlock[format](editor);
}

// A format bar button: a mark toggles as its shortcut does, Link opens the link editor.
export function applyFormat(
  editor: LexicalEditor,
  { format, applied }: { format: Format; applied: boolean },
): void {
  if (format === 'link') editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND);
  else if (isMarkFormat(format))
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  else toggleBlock(editor, { format, applied });
}
