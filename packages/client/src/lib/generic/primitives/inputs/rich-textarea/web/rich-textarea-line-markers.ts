import {
  $createListItemNode,
  $createListNode,
  $isListNode,
  type ListType,
} from '@lexical/list';
import {
  $getSelection,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
  type PointType,
  type TextNode,
} from 'lexical';

const orderedMarker = /^(\d{1,9})\.$/;
const bulletMarker = /^[-*+]$/;

interface LineMarker {
  text: TextNode;
  paragraph: ParagraphNode;
  type: ListType;
  start: number;
}

function markerType(
  marker: string,
): { type: ListType; start: number } | undefined {
  const ordered = orderedMarker.exec(marker);
  if (ordered) return { type: 'number', start: Number(ordered[1]) };
  return bulletMarker.test(marker) ? { type: 'bullet', start: 1 } : undefined;
}

function $collapsedAnchor(): PointType | undefined {
  const selection = $getSelection();
  const collapsed = $isRangeSelection(selection) && selection.isCollapsed();
  return collapsed ? selection.anchor : undefined;
}

function isTextAtEnd(node: LexicalNode, offset: number): node is TextNode {
  return $isTextNode(node) && offset === node.getTextContentSize();
}

function $textAtCaretEnd(): TextNode | undefined {
  const anchor = $collapsedAnchor();
  if (!anchor) return;
  const text = anchor.getNode();
  return isTextAtEnd(text, anchor.offset) ? text : undefined;
}

/*
 * Right after a ⇧Return line break, or first in its paragraph where only a number is ours: Lexical's
 * own shortcut keeps the `*` and `-` a bullet is typed with.
 */
function $isLineStart(text: TextNode, type: ListType): boolean {
  const before = text.getPreviousSibling();
  return before === null ? type === 'number' : $isLineBreakNode(before);
}

function $startsLine(
  text: TextNode,
  paragraph: LexicalNode | null,
  type: ListType,
): paragraph is ParagraphNode {
  return $isParagraphNode(paragraph) && $isLineStart(text, type);
}

function $markerOn(text: TextNode): LineMarker | undefined {
  const paragraph = text.getParent();
  const typed = markerType(text.getTextContent());
  if (!typed || !$startsLine(text, paragraph, typed.type)) return;
  return { text, paragraph, ...typed };
}

// A list marker the caret has just finished on a line that follows a ⇧Return line break.
function $markerAtCaret(): LineMarker | undefined {
  const text = $textAtCaretEnd();
  return text && $markerOn(text);
}

/*
 * Typing `1. ` or `- ` starts a list from that line on, on the first line of a paragraph or after a
 * ⇧Return. Lexical's own shortcut watches only the first line and joins the list above, which would
 * renumber `3.` as `2.`; here the list is its own, starting at the number typed.
 */
// An emptied paragraph goes, unless it keeps this list apart from the list above, which would join it.
function $removeSpentParagraph(paragraph: ParagraphNode): void {
  const apart = $isListNode(paragraph.getPreviousSibling());
  if (paragraph.isEmpty() && !apart) paragraph.remove();
}

function $startListFromLine({
  text,
  paragraph,
  type,
  start,
}: LineMarker): void {
  const item = $createListItemNode();
  const list = $createListNode(type, start).append(item);
  item.append(...text.getNextSiblings());
  text.getPreviousSibling()?.remove();
  text.remove();
  paragraph.insertAfter(list);
  $removeSpentParagraph(paragraph);
  item.selectStart();
}

function typedSpace(event: KeyboardEvent): boolean {
  return event.key === ' ' && !event.isComposing;
}

export function registerLineMarkers(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => {
      if (!typedSpace(event)) return false;
      const marker = $markerAtCaret();
      if (!marker) return false;
      event.preventDefault();
      $startListFromLine(marker);
      return true;
    },
    COMMAND_PRIORITY_HIGH,
  );
}
