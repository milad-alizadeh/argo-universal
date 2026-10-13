import { $isListItemNode, $isListNode } from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  INDENT_CONTENT_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import { $closest } from './rich-textarea-selection';

function $inListItem(): boolean {
  const selection = $getSelection();
  return (
    $isRangeSelection(selection) &&
    $closest(selection.anchor.getNode(), $isListItemNode) !== undefined
  );
}

// A top-level item has nowhere to un-nest to, so ⇧Tab takes it out of the list.
function $outdent(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;
  const item = $closest(selection.anchor.getNode(), $isListItemNode);
  const nested = item && $isListItemNode(item.getParent()?.getParent() ?? null);
  if (!item || nested || !$isListNode(item.getParent())) return false;
  $setBlocksType(selection, $createParagraphNode);
  return true;
}

/*
 * Inside a list item, Tab nests it and ⇧Tab un-nests it. Elsewhere the field leaves Tab to the browser,
 * so focus moves on and no tab character is typed.
 */
export function registerListTab(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_TAB_COMMAND,
    (event) => {
      if (!$inListItem()) return false;
      event.preventDefault();
      if (event.shiftKey && $outdent()) return true;
      const command = event.shiftKey
        ? OUTDENT_CONTENT_COMMAND
        : INDENT_CONTENT_COMMAND;
      return editor.dispatchCommand(command);
    },
    COMMAND_PRIORITY_EDITOR,
  );
}
