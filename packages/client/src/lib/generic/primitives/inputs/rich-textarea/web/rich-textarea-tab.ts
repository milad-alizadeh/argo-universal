import { $isListItemNode } from '@lexical/list';
import {
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

      const command = event.shiftKey
        ? OUTDENT_CONTENT_COMMAND
        : INDENT_CONTENT_COMMAND;

      return editor.dispatchCommand(command);
    },
    COMMAND_PRIORITY_EDITOR,
  );
}
