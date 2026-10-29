import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  type LexicalEditor,
  type LexicalNode,
  type PointType,
  type RangeSelection,
} from 'lexical';
import type * as React from 'react';
import { useImperativeHandle } from 'react';
import type { RichTextareaHandle } from '../rich-textarea-props';
import { separatorBefore } from '../rich-textarea-suggestions';

function textOf(node: LexicalNode | null): string {
  return node ? node.getTextContent() : '';
}

// The text just before a point, reaching to the sibling before it when the point opens a text node.
function textBefore(point: PointType): string {
  const node = point.getNode();

  if ($isElementNode(node))
    return textOf(node.getChildAtIndex(point.offset - 1));

  const before = node.getTextContent().slice(0, point.offset);

  return before || textOf(node.getPreviousSibling());
}

function startPoint(selection: RangeSelection): PointType {
  return selection.isBackward() ? selection.focus : selection.anchor;
}

// The caret, or the end of the text for a field that has not held one yet.
function $selectionOrEnd(): RangeSelection | null {
  const selection = $getSelection();

  if ($isRangeSelection(selection)) return selection;

  $getRoot().selectEnd();
  const placed = $getSelection();

  return $isRangeSelection(placed) ? placed : null;
}

function $insertWord(word: string): void {
  const selection = $selectionOrEnd();

  if (!selection) return;

  const before = textBefore(startPoint(selection));
  selection.insertText(separatorBefore(before) + word);
}

function $focusedInsert(editor: LexicalEditor, word: string): void {
  editor.focus();
  editor.update(() => $insertWord(word));
}

// Hands the parent `insertWord`, which the Composer's Slash Commands choice uses to put a `/` at the caret.
export function HandlePlugin({
  handle,
}: {
  handle?: React.Ref<RichTextareaHandle>;
}): null {
  const [editor] = useLexicalComposerContext();

  const build = (): RichTextareaHandle => ({
    insertWord: (word) => $focusedInsert(editor, word),
  });

  useImperativeHandle(handle, build, [editor]);

  return null;
}
