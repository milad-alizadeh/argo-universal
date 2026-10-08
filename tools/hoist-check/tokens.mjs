const whitespace = /\s+/y;
const lineComment = /\/\/[^\n]*/y;
const blockComment = /\/\*[\s\S]*?\*\//y;
const patterns = [
  whitespace,
  lineComment,
  blockComment,
  /"(?:\\[\s\S]|[^"\\])*"/y,
  /'(?:\\[\s\S]|[^'\\])*'/y,
  /`(?:\\[\s\S]|[^`\\])*`/y,
  /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y,
  /[A-Za-z_$][\w$]*/y,
  /[\s\S]/y,
];
const discarded = new Set([whitespace, lineComment, blockComment]);

function matchToken(text, position, pattern) {
  pattern.lastIndex = position;
  const match = pattern.exec(text);
  return match ? { raw: match[0], discard: discarded.has(pattern) } : undefined;
}

function nextToken(text, position) {
  return patterns
    .map((pattern) => matchToken(text, position, pattern))
    .find(Boolean);
}

export function* tokens(text) {
  let position = 0;
  while (position < text.length) {
    const token = nextToken(text, position);
    if (!token.discard) yield token.raw;
    position += token.raw.length;
  }
}

export function unquote(token) {
  if (!token) return;
  if (!['"', "'", '`'].includes(token[0])) return;
  return token.slice(1, -1);
}
