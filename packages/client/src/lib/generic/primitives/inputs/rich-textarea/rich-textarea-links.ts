import { autoLinkUrlMatcher, type LinkMatcher } from '@lexical/link';
import {
  $getSelection,
  $isRangeSelection,
  type PointType,
  type RangeSelection,
} from 'lexical';
const linkProtocols = new Set(['http:', 'https:', 'mailto:']);

// Whether pasted text is a whole URL, so pasting it over a selection links the selection.
export function isLinkUrl(text: string): boolean {
  if (/\s/.test(text) || !URL.canParse(text)) return false;
  return linkProtocols.has(new URL(text).protocol);
}

const scriptSchemes = ['javascript:', 'data:', 'vbscript:'];

/*
 * Whether a URL would run a script when followed. Browsers ignore spaces and control characters in a
 * scheme, and its case.
 */
export function isScriptUrl(url: string): boolean {
  const scheme = url.replaceAll(/[\s\p{Cc}]/gu, '').toLowerCase();
  return scriptSchemes.some((script) => scheme.startsWith(script));
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
