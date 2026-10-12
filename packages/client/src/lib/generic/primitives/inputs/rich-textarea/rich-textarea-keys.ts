import {
  COMMAND_PRIORITY_HIGH,
  CONTROL_OR_META,
  FORMAT_TEXT_COMMAND,
  isExactShortcutMatch,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  type KeyboardEventModifierMask,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical';

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

// ⇧Return and a Return that ends an IME composition stay with Lexical, which adds a line.
function sendsOnReturn(event: KeyboardEvent | null): event is KeyboardEvent {
  return event !== null && !event.shiftKey && !event.isComposing;
}

export function registerReturnToSubmit(
  editor: LexicalEditor,
  submit: () => void,
): () => void {
  return editor.registerCommand(
    KEY_ENTER_COMMAND,
    (event) => {
      if (!sendsOnReturn(event)) return false;
      event.preventDefault();
      submit();
      return true;
    },
    COMMAND_PRIORITY_HIGH,
  );
}
