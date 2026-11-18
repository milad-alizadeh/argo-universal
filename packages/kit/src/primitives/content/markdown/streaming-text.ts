import { lexMarkdown } from '#kit/lex-markdown';

function withoutTrailingMarker(text: string): string {
  const start = text.lastIndexOf('\n') + 1;
  const line = text.slice(start).trimEnd();
  const marker = /^(?:[*_]{1,2}|[-+]|\d+[.)]|#{1,6})$/;

  return marker.test(line) ? text.slice(0, start) : text;
}

// Hold a marker-only last line until its text arrives, so an emphasis opener never flashes as an empty list.
export function streamingText(text: string): string {
  const held = withoutTrailingMarker(text);

  return lexMarkdown(text).at(-1)?.type === 'code' ? text : held;
}
