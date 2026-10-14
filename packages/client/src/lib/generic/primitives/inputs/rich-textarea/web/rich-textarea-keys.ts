import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  CONTROL_OR_META,
  FORMAT_TEXT_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  isExactShortcutMatch,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  type KeyboardEventModifierMask,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical';
import { sendsOnReturn } from '../rich-textarea-return';
import { $returnBlock, $wrapInCodeBlock } from './rich-textarea-blocks';

const codeBlockModifiers = { ...CONTROL_OR_META, shiftKey: true };

/*
 * Marks Lexical does not bind itself; ⌘B and ⌘I are built in. Underline has no markdown, so ⌘U
 * does nothing rather than show a mark the sent text would lose.
 */
const markShortcuts: {
  key: string;
  modifiers: KeyboardEventModifierMask;
  format?: TextFormatType;
}[] = [
  {
    key: 'x',
    modifiers: { ...CONTROL_OR_META, shiftKey: true },
    format: 'strikethrough',
  },
  { key: 'e', modifiers: CONTROL_OR_META, format: 'code' },
  { key: 'u', modifiers: CONTROL_OR_META },
];

function applyMarkShortcut(
  editor: LexicalEditor,
  event: KeyboardEvent,
): boolean {
  const shortcut = markShortcuts.find(({ key, modifiers }) =>
    isExactShortcutMatch(event, key, modifiers),
  );

  if (!shortcut) return false;
  event.preventDefault();

  if (shortcut.format)
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, shortcut.format);

  return true;
}

export function registerMarkShortcuts(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => applyMarkShortcut(editor, event),
    COMMAND_PRIORITY_HIGH,
  );
}

// ⌘⇧C wraps the selection in a code block.
export function registerBlockShortcuts(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => {
      if (!isExactShortcutMatch(event, 'c', codeBlockModifiers)) return false;
      event.preventDefault();
      editor.update($wrapInCodeBlock);

      return true;
    },
    COMMAND_PRIORITY_HIGH,
  );
}

// ⇧Return and a Return that ends an IME composition stay with Lexical, which adds a line.
function plainReturn(event: KeyboardEvent | null): event is KeyboardEvent {
  return event !== null && !event.shiftKey && !event.isComposing;
}

// Return sends from a paragraph or quote; Lexical's list and code nodes carry out the other actions.
function $sendsOnReturn(event: KeyboardEvent | null): event is KeyboardEvent {
  const selection = $getSelection();

  return (
    plainReturn(event) &&
    $isRangeSelection(selection) &&
    sendsOnReturn({ block: $returnBlock(selection) })
  );
}

// The reference menu is open, so Return chooses a row instead of sending.
function menuOpen(editor: LexicalEditor): boolean {
  return (
    editor.getRootElement()?.getAttribute('aria-controls') === 'typeahead-menu'
  );
}

export function registerReturnToSubmit(
  editor: LexicalEditor,
  submit: () => void,
): () => void {
  return editor.registerCommand(
    KEY_ENTER_COMMAND,
    (event) => {
      if (menuOpen(editor) || !$sendsOnReturn(event)) return false;
      event.preventDefault();
      submit();

      return true;
    },
    COMMAND_PRIORITY_HIGH,
  );
}

function shiftedReturn(event: KeyboardEvent | null): event is KeyboardEvent {
  return event !== null && event.shiftKey && !event.isComposing;
}

function $inListItem(): boolean {
  const selection = $getSelection();

  return (
    $isRangeSelection(selection) && $returnBlock(selection) === 'list-item'
  );
}

/*
 * ⇧Return in a list item adds an item, as Return does, rather than a hanging line inside the item;
 * the line break would indent the next line and keep `2.` typed there from starting an item.
 */
export function registerListLines(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_ENTER_COMMAND,
    (event) => {
      if (!shiftedReturn(event) || !$inListItem()) return false;
      event.preventDefault();

      return editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND);
    },
    COMMAND_PRIORITY_HIGH,
  );
}
