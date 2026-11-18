import { walkTokens } from 'marked';
import { lexMarkdown } from '#kit/lex-markdown';

const marker = /^(?:[*_]{1,2}|[-+]|\d+[.)]|#{1,6})$/;

// A single open emphasis at the start of the line can preview its final style.
const openEmphasis = /^(\*{1,3}|_{1,3})[^\s*_][^*_]*?([*_]{0,3})$/;

function closeEmphasis(text: string, line: string): string {
  const completed = line.replace(
    openEmphasis,
    (match, opening: string, ending: string) =>
      opening.startsWith(ending) ? match + opening.slice(ending.length) : match,
  );

  return completed === line
    ? text
    : text.trimEnd() + completed.slice(line.length);
}

function previewLastLine(text: string): string {
  const start = text.lastIndexOf('\n') + 1;
  const line = text.slice(start).trim();

  if (marker.test(line)) return text.slice(0, start);

  return closeEmphasis(text, line);
}

// The last leaf may be inside a list or quote; its code stays literal at every indentation.
function endsInCode(text: string): boolean {
  let lastType: string | undefined;
  void walkTokens(lexMarkdown(text), (token) => {
    lastType = token.type;
  });

  return lastType === 'code';
}

// Preview ambiguous markers without showing temporary blocks or changing the style of prose already on screen.
export function streamingText(text: string): string {
  const preview = previewLastLine(text);

  if (preview === text) return text;

  return endsInCode(text) ? text : preview;
}
