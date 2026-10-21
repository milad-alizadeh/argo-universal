import { $isListItemNode, type ListItemNode } from '@lexical/list';
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

function $caretItem(): ListItemNode | undefined {
  const selection = $getSelection();

  return $isRangeSelection(selection)
    ? $closest(selection.anchor.getNode(), $isListItemNode)
    : undefined;
}

function $topLevelItem(): ListItemNode | undefined {
  const item = $caretItem();

  return item?.getParents().some($isListItemNode) ? undefined : item;
}

// A top-level item has nowhere to un-nest to, so ⇧Tab takes it out of the list.
function $leaveList(): boolean {
  const selection = $getSelection();

  if (!$topLevelItem() || !$isRangeSelection(selection)) return false;
  $setBlocksType(selection, $createParagraphNode);

  return true;
}

function $outdent(editor: LexicalEditor): boolean {
  return $leaveList() || editor.dispatchCommand(OUTDENT_CONTENT_COMMAND);
}

/*
 * Inside a list item, Tab nests it and ⇧Tab un-nests it. Elsewhere the field leaves Tab to the browser,
 * so focus moves on and no tab character is typed.
 */
export function registerListTab(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_TAB_COMMAND,
    (event) => {
      if (!$caretItem()) return false;
      event.preventDefault();

      return event.shiftKey
        ? $outdent(editor)
        : editor.dispatchCommand(INDENT_CONTENT_COMMAND);
    },
    COMMAND_PRIORITY_EDITOR,
  );
}
