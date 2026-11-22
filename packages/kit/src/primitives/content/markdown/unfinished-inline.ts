import {
  getDefaults,
  Lexer,
  Tokenizer,
  walkTokens,
  type Token,
  type Tokens,
  type TokensList,
} from 'marked';

const labelPart = /\\.|`+|[[\]]/g;

const targetPart = /\\.|[()<>"']/g;

function quoteEnd(source: string, index: number, part: string): string {
  if (part === '<' && index === 0) return '>';

  return (part === '"' || part === "'") &&
    (index === 0 || /[ \t]/.test(source.charAt(index - 1)))
    ? part
    : '';
}

function* targetParts(source: string): Iterable<string> {
  let quotedEnd = '';

  for (const { 0: part, index } of source.matchAll(targetPart)) {
    if (quotedEnd) {
      if (part === quotedEnd) quotedEnd = '';

      continue;
    }

    quotedEnd = quoteEnd(source, index, part);

    if (!quotedEnd) yield part;
  }
}

function pendingTarget(source: string): boolean {
  let depth = 1;

  for (const part of targetParts(source.trimStart())) {
    if (part === '(') depth++;

    if (part === ')') depth--;

    if (depth === 0) return false;
  }

  return true;
}

function* labelParts(label: string): Iterable<RegExpExecArray> {
  let codeEnd = 0;

  for (const match of label.matchAll(labelPart)) {
    if (match.index < codeEnd) continue;

    if (match[0].startsWith('`')) {
      const code = Lexer.rules.inline.gfm.code.exec(label.slice(match.index));

      if (code) {
        codeEnd = match.index + code[0].length;

        continue;
      }
    }

    yield match;
  }
}

function pendingAfterLabel(source: string): boolean {
  return (
    source === '' ||
    (source.startsWith('(') && pendingTarget(source.slice(1))) ||
    /^\[(?:\\.|[^\]\\])*$/u.test(source)
  );
}

function pendingLabel(label: string): boolean {
  let depth = 1;
  let openCode = false;

  for (const match of labelParts(label)) {
    if (match[0] === '[') depth++;

    if (match[0] === ']') depth--;

    openCode ||= match[0].startsWith('`');

    if (depth !== 0) continue;

    return openCode || pendingAfterLabel(label.slice(match.index + 1));
  }

  return true;
}

function pendingLink(source: string): boolean {
  const start = source.startsWith('![') ? 2 : 1;

  return source[start - 1] === '[' && pendingLabel(source.slice(start));
}

const pendingAngleLink = /^<(?:[a-z][^\s<>]*)?$/i;

const pendingStrike = /^(?:~$|~~(?:$|[^\s~][^~]*~?$))/;

class TailTokenizer extends Tokenizer {
  private heldFrom: number | undefined;

  constructor(private readonly liveText: string) {
    super();
  }

  private hold(source: string): Tokens.Text | undefined {
    if (!(this.lexer instanceof TailLexer) || !this.lexer.isLiveInline())
      return;

    if (this.lexer.state.inLink || this.lexer.state.inRawBlock) return;

    const tail = source.trimEnd();

    if (tail.includes('\n') || !this.liveText.endsWith(tail)) return;

    this.heldFrom = this.liveText.length - tail.length;

    return { type: 'text', raw: source, text: '' };
  }

  heldOffset(): number | undefined {
    return this.heldFrom;
  }

  override reflink(
    ...[source, links]: Parameters<Tokenizer['reflink']>
  ): ReturnType<Tokenizer['reflink']> {
    const token = super.reflink(source, links);

    if (token && token.type !== 'text') return token;

    /* Marked has already tried parsing a complete link. Hold the tail before its URL becomes a standalone link. */
    if (!(this.lexer instanceof TailLexer) || !this.lexer.isLiveInline())
      return token;

    return (pendingLink(source) && this.hold(source)) || token;
  }

  override inlineText(source: string): Tokens.Text | undefined {
    const pending =
      source.startsWith('`') ||
      pendingAngleLink.test(source) ||
      pendingStrike.test(source);

    return (pending && this.hold(source)) || super.inlineText(source);
  }
}

class TailLexer extends Lexer {
  private liveInline = false;
  private lastInlineToken: Token | undefined;

  isLiveInline(): boolean {
    return this.liveInline;
  }

  override inlineTokens(source: string, tokens?: Token[]): Token[] {
    const previous = this.liveInline;

    // The block lexer queues inline scopes in document order before parsing them.
    this.liveInline =
      tokens !== undefined && tokens === this.inlineQueue.at(-1)?.tokens;
    const result = super.inlineTokens(source, tokens);

    if (this.liveInline) this.lastInlineToken = result.at(-1);

    this.liveInline = previous;

    return result;
  }

  endsWithLiveInline(tokens: TokensList): boolean {
    let lastToken: Token | undefined;
    void walkTokens(tokens, (token) => {
      if (token.type !== 'space') lastToken = token;
    });

    return lastToken !== undefined && lastToken === this.lastInlineToken;
  }
}

interface LexedTail {
  tokens: TokensList;
  heldFrom: number | undefined;
}

export function lexWithUnfinishedInline(text: string): LexedTail {
  const tokenizer = new TailTokenizer(text.trimEnd());
  const lexer = new TailLexer({ ...getDefaults(), tokenizer });
  const tokens = lexer.lex(text);
  const heldFrom = tokenizer.heldOffset();

  if (heldFrom !== undefined && !lexer.endsWithLiveInline(tokens))
    return { tokens: Lexer.lex(text), heldFrom: undefined };

  return { tokens, heldFrom };
}
