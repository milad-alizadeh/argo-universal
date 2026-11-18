import { walkTokens } from 'marked';
import { lexMarkdown } from '#kit/lex-markdown';

function withoutTrailingMarker(text: string): string {
  const start = text.lastIndexOf('\n') + 1;
  const line = text.slice(start).trim();
  const marker = /^(?:[*_]{1,2}|[-+]|\d+[.)]|#{1,6})$/;

  return marker.test(line) ? text.slice(0, start) : text;
}

// The last leaf may be inside a list or quote; its code stays literal at every indentation.
function endsInCode(text: string): boolean {
  let lastType: string | undefined;
  void walkTokens(lexMarkdown(text), (token) => {
    lastType = token.type;
  });

  return lastType === 'code';
}

// Hold a marker-only last line until its text arrives, so an emphasis opener never flashes as an empty list.
export function streamingText(text: string): string {
  const held = withoutTrailingMarker(text);

  if (held === text) return text;

  return endsInCode(text) ? text : held;
}
