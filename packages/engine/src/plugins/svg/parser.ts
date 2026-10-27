import { readToken, type MarkupToken } from './markup';
import type { SvgAstNode } from './types';

interface ParseState {
  root: SvgAstNode | null;
  open: SvgAstNode[];
}

interface Attributes {
  props: SvgAstNode['props'];
  rest: string;
}

interface TokenReader {
  opening: number;
  closing: number;
  read: (state: ParseState, body: string) => void;
}

const cdataOpening = '<![CDATA[';

const cdataClosing = ']]>';

const nameSource = '[A-Za-z0-9:_-]+';

const valueSource = `"[^"]*"|'[^']*'|[^\\s/]*`;

const namePattern = new RegExp(`^${nameSource}`);

const attributePattern = new RegExp(
  `\\s+(${nameSource})(?:\\s*=\\s*(${valueSource}))?`,
  'y',
);

const tagEndPattern = /^\s*\/?$/;

const closingEndPattern = /^\s*$/;

const tokenReaders = new Map<MarkupToken['kind'], TokenReader>([
  ['open', { opening: 1, closing: 1, read: openElement }],
  ['close', { opening: 2, closing: 1, read: closeElement }],
  [
    'cdata',
    {
      opening: cdataOpening.length,
      closing: cdataClosing.length,
      read: addText,
    },
  ],
]);

/*
 * Reads the tree of one SVG document, on the tokens `scanMarkup` counts. Attribute names are camel-cased
 * and numeric values read as numbers, as react-native-svg's XML parser does. Entities stay as written and
 * `style` stays a string, so the allowlists refuse both. A document with no element is null.
 */
export function parseSvg(source: string): SvgAstNode | null {
  const state: ParseState = { root: null, open: [] };

  for (let position = 0; position < source.length;)
    position = readNext(state, source, position);

  if (state.open.length) throw new Error('Unexpected end of input');

  return state.root;
}

function readNext(state: ParseState, source: string, position: number): number {
  const start = source.indexOf('<', position);

  if (start < 0) return source.length;

  readText(state, source.slice(position, start));

  const token = readToken(source, start);

  readTokenInto(state, source.slice(start, token.end), token.kind);

  return token.end;
}

function readTokenInto(
  state: ParseState,
  raw: string,
  kind: MarkupToken['kind'],
): void {
  const reader = tokenReaders.get(kind);

  reader?.read(state, raw.slice(reader.opening, raw.length - reader.closing));
}

function readText(state: ParseState, text: string): void {
  if (/\S/.test(text)) addText(state, text);
}

function addText(state: ParseState, text: string): void {
  state.open.at(-1)?.children.push(text);
}

function openElement(state: ParseState, tag: string): void {
  const node = readElement(tag);

  attach(state, node);

  if (!tag.endsWith('/')) state.open.push(node);
}

function attach(state: ParseState, node: SvgAstNode): void {
  const parent = state.open.at(-1);

  if (parent) parent.children.push(node);
  else state.root ??= node;
}

function closeElement(state: ParseState, tag: string): void {
  const name = nameOf(tag);

  expectEnd(tag.slice(name.length), closingEndPattern);

  expectOpen(state.open.pop(), name);
}

function expectOpen(current: SvgAstNode | undefined, name: string): void {
  if (current?.tag !== name)
    throw new Error(`Expected closing tag </${name}> to match its opening tag`);
}

function nameOf(tag: string): string {
  const name = namePattern.exec(tag)?.[0];

  if (!name) throw new Error('Expected tag name');

  return name;
}

function expectEnd(rest: string, pattern: RegExp): void {
  if (!pattern.test(rest)) throw new Error('Expected >');
}

function readElement(tag: string): SvgAstNode {
  const name = nameOf(tag);
  const { props, rest } = readAttributes(tag, name.length);

  expectEnd(rest, tagEndPattern);

  return { tag: name, props, children: [] };
}

function readAttributes(tag: string, from: number): Attributes {
  const entries: Array<[string, string]> = [];
  let end = from;

  for (;;) {
    attributePattern.lastIndex = end;

    const match = attributePattern.exec(tag);

    if (!match) break;

    entries.push(attribute(match));
    end = attributePattern.lastIndex;
  }

  return { props: Object.fromEntries(entries), rest: tag.slice(end) };
}

function attribute(match: RegExpExecArray): [string, string] {
  const name = match[1] ?? '';

  return [camelCase(name), readValue(name, match[2])];
}

const camelCase = (name: string): string =>
  name.replaceAll(/[:-]([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );

// An attribute with no value is the string "true".
function readValue(name: string, raw: string | undefined): string {
  if (raw === undefined) return 'true';

  return numeric(name, /^["']/.test(raw) ? raw.slice(1, -1) : raw);
}

// A numeric value is the number it spells, except an id.
function numeric(name: string, value: string): string {
  return name !== 'id' && spellsNumber(value) ? String(Number(value)) : value;
}

const spellsNumber = (value: string): boolean =>
  value.trim() !== '' && !Number.isNaN(Number(value));
