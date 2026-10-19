import { tagEnd } from './markup-tag-end';
import { svgDepthLimit, svgElementLimit } from './types';

interface MarkupToken {
  end: number;
  kind: 'comment' | 'cdata' | 'instruction' | 'declaration' | 'open' | 'close';
  selfClosing?: boolean;
}

interface ScanState {
  roots: number;
  depth: number;
  elements: number;
  position: number;
  declarations: string | null;
}

export interface MarkupScan {
  roots: number;
  declarations: string | null;
}

const delimiters = new Map<string, [string, string]>([
  ['comment', ['<!--', '-->']],
  ['cdata', ['<![CDATA[', ']]>']],
  ['instruction', ['<?', '?>']],
]);

export function scanMarkup(source: string): MarkupScan {
  const state = scanTokens(source);

  if (state.depth !== 0) throw new Error('unclosed element');

  return { roots: state.roots, declarations: state.declarations };
}

function scanTokens(source: string): ScanState {
  const state: ScanState = {
    roots: 0,
    depth: 0,
    elements: 0,
    position: 0,
    declarations: null,
  };

  while (state.position < source.length) {
    state.position = scanNext(source, state);
  }

  return state;
}

function scanNext(source: string, state: ScanState): number {
  const start = source.indexOf('<', state.position);

  if (start < 0) return source.length;

  const token = readToken(source, start);

  applyToken(state, token, source);

  return token.end;
}

function applyToken(
  state: ScanState,
  token: MarkupToken,
  source: string,
): void {
  if (token.kind === 'declaration')
    state.declarations = declarationName(source, state.position);

  countRoot(state, token);
  state.depth += depthChange(token);
  countElement(state, token);
  validateMarkupLimits(state);
}

function countElement(state: ScanState, token: MarkupToken): void {
  if (token.kind === 'open') state.elements += 1;
}

function validateMarkupLimits(state: ScanState): void {
  if (state.depth > svgDepthLimit)
    throw new Error(`depth cap exceeded (${svgDepthLimit})`);

  if (state.elements > svgElementLimit)
    throw new Error(`element cap exceeded (${svgElementLimit})`);
}

function countRoot(state: ScanState, token: MarkupToken): void {
  if (token.kind === 'open' && state.depth === 0) state.roots += 1;
}

function depthChange(token: MarkupToken): number {
  const depthDelta = {
    cdata: 0,
    close: -1,
    comment: 0,
    declaration: 0,
    instruction: 0,
  };

  if (token.kind === 'open') return token.selfClosing ? 0 : 1;

  return depthDelta[token.kind];
}

function readToken(source: string, start: number): MarkupToken {
  const marker = source.slice(start, start + 2);

  if (marker === '<!') return readDeclaration(source, start);

  if (marker === '<?') return readDelimited(source, start, 'instruction');

  return readTag(source, start);
}

function readDeclaration(source: string, start: number): MarkupToken {
  if (source.startsWith('<!--', start))
    return readDelimited(source, start, 'comment');

  if (source.startsWith('<![CDATA[', start))
    return readDelimited(source, start, 'cdata');

  return { end: tagEnd(source, start + 2) + 1, kind: 'declaration' };
}

function readDelimited(
  source: string,
  start: number,
  kind: 'comment' | 'cdata' | 'instruction',
): MarkupToken {
  const delimitersForKind = delimiters.get(kind);

  if (!delimitersForKind) throw new Error('unsupported XML delimiter');

  const [opening, closing] = delimitersForKind;
  const contentStart = start + opening.length;
  const end = source.indexOf(closing, contentStart);

  if (end < 0) throw new Error(`malformed XML ${kind}`);

  assertNoHiddenMarkup(kind, source.slice(contentStart, end));

  return { end: end + closing.length, kind };
}

function assertNoHiddenMarkup(kind: string, content: string): void {
  if (kind === 'instruction') return;

  if (containsTagMarkup(content))
    throw new Error(`tag markup in ${kind} refused`);
}

function readTag(source: string, start: number): MarkupToken {
  const closing = source.startsWith('</', start);
  const end = tagEnd(source, start + (closing ? 2 : 1));

  return {
    end: end + 1,
    kind: closing ? 'close' : 'open',
    selfClosing: /\/\s*$/.test(source.slice(start + 1, end)),
  };
}

function declarationName(source: string, start: number): string | null {
  const declaration = source
    .slice(start + 2)
    .trimStart()
    .toLowerCase();

  if (declaration.startsWith('doctype')) return 'doctype';

  if (declaration.startsWith('entity')) return 'entity';

  return null;
}

function containsTagMarkup(source: string): boolean {
  return /<\/?[A-Za-z]/.test(source);
}
