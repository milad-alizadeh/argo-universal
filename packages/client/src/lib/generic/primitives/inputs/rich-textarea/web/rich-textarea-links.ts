import { autoLinkUrlMatcher, type LinkMatcher } from '@lexical/link';
import type { PointType } from 'lexical';
import { $rangeSelection } from './rich-textarea-selection';

const scriptSchemes = ['javascript:', 'data:', 'vbscript:'];

/*
 * Whether a URL would run a script when followed. Browsers ignore spaces and control characters in a
 * scheme, and its case.
 */
export function isScriptUrl(url: string): boolean {
  const scheme = url.replaceAll(/[\s\p{Cc}]/gu, '').toLowerCase();
  return scriptSchemes.some((script) => scheme.startsWith(script));
}

function endsAt(point: PointType, url: string): boolean {
  const shown = point.getNode().getTextContent();
  return point.offset === shown.length && shown.endsWith(url);
}

function $caretEndsWith(url: string): boolean {
  const caret = $rangeSelection({ collapsed: true })?.anchor;
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
