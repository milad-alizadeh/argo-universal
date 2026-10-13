import { $isLinkNode, type LinkNode } from '@lexical/link';
import {
  $convertFromMarkdownString,
  type Transformer,
} from '@lexical/markdown';
import { $getRoot, type TextNode } from 'lexical';
import { markBlankLines } from './rich-textarea-blank-lines';
import { replacer, unusedCharacters } from './rich-textarea-stand-ins';

/*
 * Export writes text exactly as shown (ADR-0012), so every backslash in a draft is one the person
 * typed. Import keeps each backslash, and the character after it, out of Lexical's reach: it would
 * read `\*` as an escaped star and drop the backslash. Only a link escapes on export, so a link's
 * URL and text are unescaped once the stand-ins are swapped back.
 */
const escape = /\\[!-/:-@[-`{-~]?/g;

const unescape = /\\([!-/:-@[-`{-~])/g;

const linkTextEscape = /\\([[\]\\])/g;

interface Shielded {
  markdown: string;
  unshield: (text: string) => string;
  blankLine: string;
}

function escapedCharacters(markdown: string): string[] {
  return [...new Set([...(markdown.match(escape) ?? [])].join(''))];
}

function shield(markdown: string, transformers: Transformer[]): Shielded {
  const escaped = escapedCharacters(markdown);

  const [blankLine = '', ...standIns] = unusedCharacters(
    markdown,
    escaped.length + 1,
  );

  const swap = replacer(escaped, standIns);
  const literal = markdown.replaceAll(escape, swap);

  return {
    markdown: markBlankLines(literal, { mark: blankLine, transformers }),
    unshield: replacer(standIns, escaped),
    blankLine,
  };
}

function $restoreText(text: TextNode, { unshield, blankLine }: Shielded): void {
  if (text.getTextContent() === blankLine) {
    text.remove();

    return;
  }

  const shown = unshield(text.getTextContent());
  const inLink = $isLinkNode(text.getParent());
  text.setTextContent(inLink ? shown.replaceAll(linkTextEscape, '$1') : shown);
}

function $restoreLink(link: LinkNode, { unshield }: Shielded): void {
  link.setURL(unshield(link.getURL()).replaceAll(unescape, '$1'));
}

function $restore(shielded: Shielded): void {
  const texts = $getRoot().getAllTextNodes();

  const links = new Set(
    texts.map((text) => text.getParent()).filter($isLinkNode),
  );

  for (const text of texts) $restoreText(text, shielded);

  for (const link of links) $restoreLink(link, shielded);
}

// Fills the editor with a draft's markdown, keeping its text exactly as it was typed.
export function $importLiteralMarkdown(
  markdown: string,
  transformers: Transformer[],
): void {
  const shielded = shield(markdown, transformers);
  $convertFromMarkdownString(shielded.markdown, transformers);
  $restore(shielded);
}
