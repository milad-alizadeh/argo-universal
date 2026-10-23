import { $isLinkNode, $toggleLink, formatUrl } from '@lexical/link';
import {
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  CONTROL_OR_META,
  createCommand,
  isExactShortcutMatch,
  KEY_DOWN_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  mergeRegister,
  type RangeSelection,
} from 'lexical';
import type { LinkFields } from '../rich-textarea-link-form';
import { isScriptUrl } from './rich-textarea-links';
import { selectedRect } from './rich-textarea-placement';
import { $closest, $rangeSelection } from './rich-textarea-selection';

// The selected text the link editor edits, and where it shows it.
export interface LinkTarget {
  fields: LinkFields;
  selection: RangeSelection;
  rect: DOMRect;
}

function $linkedUrl(selection: RangeSelection): string {
  return $closest(selection.anchor.getNode(), $isLinkNode)?.getURL() ?? '';
}

function $linkTarget(): LinkTarget | undefined {
  const selection = $rangeSelection({ collapsed: false });
  const rect = selectedRect();

  if (!selection || !rect) return undefined;

  const fields = {
    text: selection.getTextContent(),
    url: $linkedUrl(selection),
  };

  return { fields, selection: selection.clone(), rect };
}

// Opens the link editor for the selection, from ⌘K or the format bar's Link button.
export const OPEN_LINK_EDITOR_COMMAND: LexicalCommand<void> = createCommand(
  'OPEN_LINK_EDITOR_COMMAND',
);

function openOnShortcut(
  editor: LexicalEditor,
): (event: KeyboardEvent) => boolean {
  return (event) => {
    if (!isExactShortcutMatch(event, 'k', CONTROL_OR_META)) return false;

    if (!editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND)) return false;
    event.preventDefault();

    return true;
  };
}

function openOnSelection(
  openEditor: (target: LinkTarget) => void,
): () => boolean {
  return () => {
    const target = $linkTarget();

    if (target) openEditor(target);

    return target !== undefined;
  };
}

function registerShortcut(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    openOnShortcut(editor),
    COMMAND_PRIORITY_HIGH,
  );
}

// ⌘K or the Link button on a selection opens the link editor for it.
export function registerLinkEditor(
  editor: LexicalEditor,
  openEditor: (target: LinkTarget) => void,
): () => void {
  return mergeRegister(
    registerShortcut(editor),
    editor.registerCommand(
      OPEN_LINK_EDITOR_COMMAND,
      openOnSelection(openEditor),
      COMMAND_PRIORITY_EDITOR,
    ),
  );
}

// New text replaces the selection and stays selected, so the link covers it.
function $retext(selection: RangeSelection, text: string): void {
  if (text === '' || text === selection.getTextContent()) return;
  selection.insertText(text);
  const { focus } = selection;
  selection.anchor.set(focus.key, focus.offset - text.length, 'text');
}

// Links the selected text as the editor's fields say; an empty Link removes the link, a script URL saves nothing.
export function $saveLink(
  selection: RangeSelection,
  { text, url }: LinkFields,
): void {
  if (isScriptUrl(url)) return;
  const restored = selection.clone();
  $setSelection(restored);
  $retext(restored, text);
  $toggleLink(url === '' ? null : formatUrl(url));
}
