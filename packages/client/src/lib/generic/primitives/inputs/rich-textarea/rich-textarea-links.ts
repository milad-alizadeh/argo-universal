import {
  $isLinkNode,
  $toggleLink,
  autoLinkUrlMatcher,
  formatUrl,
  type LinkMatcher,
} from '@lexical/link';
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  CONTROL_OR_META,
  isExactShortcutMatch,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  type PointType,
  type RangeSelection,
} from 'lexical';
import type { LinkFields } from './rich-textarea-link-form';

const linkProtocols = new Set(['http:', 'https:', 'mailto:']);

// Whether pasted text is a whole URL, so pasting it over a selection links the selection.
export function isLinkUrl(text: string): boolean {
  if (/\s/.test(text) || !URL.canParse(text)) return false;
  return linkProtocols.has(new URL(text).protocol);
}

function $collapsedSelection(): RangeSelection | undefined {
  const selection = $getSelection();
  return $isRangeSelection(selection) && selection.isCollapsed()
    ? selection
    : undefined;
}

function endsAt(point: PointType, url: string): boolean {
  const shown = point.getNode().getTextContent();
  return point.offset === shown.length && shown.endsWith(url);
}

function $caretEndsWith(url: string): boolean {
  const caret = $collapsedSelection()?.anchor;
  return caret !== undefined && endsAt(caret, url);
}

// The caret sits right after the URL at the end of the text, so it is still being typed or was just pasted.
function $isBeingTyped(
  match: { text: string; index: number },
  text: string,
): boolean {
  return (
    match.index + match.text.length === text.length &&
    $caretEndsWith(match.text)
  );
}

// A typed or pasted URL links once a space follows it, not while it is being typed.
export const urlLinkedOnSpace: LinkMatcher = (text) => {
  const match = autoLinkUrlMatcher(text);
  if (!match || $isBeingTyped(match, text)) return null;
  return match;
};

// The selected text the link editor edits, and where it shows it.
export interface LinkTarget {
  fields: LinkFields;
  selection: RangeSelection;
  rect: DOMRect;
}

function $expandedSelection(): RangeSelection | undefined {
  const selection = $getSelection();
  return $isRangeSelection(selection) && !selection.isCollapsed()
    ? selection
    : undefined;
}

function selectedRect(): DOMRect | undefined {
  const selection = window.getSelection();
  return selection?.rangeCount
    ? selection.getRangeAt(0).getBoundingClientRect()
    : undefined;
}

function $linkedUrl(selection: RangeSelection): string {
  const node = selection.anchor.getNode();
  return [node, ...node.getParents()].find($isLinkNode)?.getURL() ?? '';
}

function $linkTarget(): LinkTarget | undefined {
  const selection = $expandedSelection();
  const rect = selectedRect();
  if (!selection || !rect) return undefined;
  const fields = {
    text: selection.getTextContent(),
    url: $linkedUrl(selection),
  };
  return { fields, selection: selection.clone(), rect };
}

function openOnShortcut(
  openEditor: (target: LinkTarget) => void,
): (event: KeyboardEvent) => boolean {
  return (event) => {
    const target = isExactShortcutMatch(event, 'k', CONTROL_OR_META)
      ? $linkTarget()
      : undefined;
    if (!target) return false;
    event.preventDefault();
    openEditor(target);
    return true;
  };
}

// ⌘K on a selection opens the link editor for it.
export function registerLinkShortcut(
  editor: LexicalEditor,
  openEditor: (target: LinkTarget) => void,
): () => void {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    openOnShortcut(openEditor),
    COMMAND_PRIORITY_HIGH,
  );
}

// New text replaces the selection and stays selected, so the link covers it.
function $retext(selection: RangeSelection, text: string): void {
  if (text === '' || text === selection.getTextContent()) return;
  selection.insertText(text);
  const { focus } = selection;
  selection.anchor.set(focus.key, focus.offset - text.length, 'text');
}

// Links the selected text as the editor's fields say; an empty Link removes the link.
export function $saveLink(
  selection: RangeSelection,
  { text, url }: LinkFields,
): void {
  const restored = selection.clone();
  $setSelection(restored);
  $retext(restored, text);
  $toggleLink(url === '' ? null : formatUrl(url));
}
