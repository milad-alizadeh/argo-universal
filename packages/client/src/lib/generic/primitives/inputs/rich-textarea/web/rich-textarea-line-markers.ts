import {
  $createListItemNode,
  $createListNode,
  type ListType,
} from '@lexical/list';
import {
  $getSelection,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  type ParagraphNode,
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

// A list marker the caret has just finished on a line that follows a ⇧Return line break.
function $markerAtCaret(): LineMarker | undefined {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
  const text = selection.anchor.getNode();
  if (!$isTextNode(text) || text.getFormat() !== 0) return;
  const paragraph = text.getParent();
  const typed = markerType(text.getTextContent());
  if (
    !$isParagraphNode(paragraph) ||
    !$isRootOrShadowRoot(paragraph.getParent()) ||
    !typed ||
    selection.anchor.offset !== text.getTextContentSize() ||
    !$isLineBreakNode(text.getPreviousSibling())
  )
    return;
  return { text, paragraph, ...typed };
}

/*
 * Markdown starts a list on any line, but Lexical's shortcut only watches the first line of a
 * paragraph. After a ⇧Return, typing `1. ` or `- ` starts a list from that line on, so a line is
 * no different from the first.
 */
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
  item.selectStart();
}

export function registerLineMarkers(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => {
      if (event.key !== ' ' || event.isComposing) return false;
      const marker = $markerAtCaret();
      if (!marker) return false;
      event.preventDefault();
      $startListFromLine(marker);
      return true;
    },
    COMMAND_PRIORITY_HIGH,
  );
}
