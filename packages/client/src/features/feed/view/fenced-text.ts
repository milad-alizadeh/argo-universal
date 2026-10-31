import { lexMarkdown } from '@repo/kit/lex-markdown';
import type { Token, Tokens } from 'marked';

export interface FencedText {
  code: string;
  // The tag the fence was written with, such as `console`; absent for a bare fence.
  language?: string;
}

const isCode = (token: Token | undefined): token is Tokens.Code =>
  token?.type === 'code';

// Markdown also reads four spaces of indent as code, and that text is not a fence.
const isFence = (token: Token | undefined): token is Tokens.Code =>
  isCode(token) && token.codeBlockStyle !== 'indented';

const only = (text: string): Token | undefined => {
  const blocks = lexMarkdown(text).filter((token) => token.type !== 'space');

  return blocks.length === 1 ? blocks[0] : undefined;
};

/*
 * An Agent writes a Tool call's text as Markdown, and the Claude Agent wraps a command's output in a
 * ```console fence and a read file's text in a bare one. The Feed draws that text as a code block of
 * its own, so a fence left in the text would show as two lines of the "output". Text that is one
 * fence and nothing else gives up its fence; any other text, indented code included, stays as written.
 */
export function unfencedText(text: string): FencedText {
  const token = only(text);

  return isFence(token)
    ? { code: token.text, language: token.lang || undefined }
    : { code: text };
}
