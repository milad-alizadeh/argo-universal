import { $isLinkNode, AutoLinkNode, LinkNode } from '@lexical/link';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_STAR,
  INLINE_CODE,
  ITALIC_UNDERSCORE,
  LINK,
  STRIKETHROUGH,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import { $getRoot, $isTextNode, type Klass, type LexicalNode } from 'lexical';

/*
 * The nodes and markdown transformers the web editor uses, shared by its drawing and its tests.
 * Block nodes (lists, quotes, code blocks) join these lists as the editor grows.
 */
export const richTextareaNodes: Klass<LexicalNode>[] = [LinkNode, AutoLinkNode];

const SINGLE_TILDE_STRIKETHROUGH: TextFormatTransformer = {
  type: 'text-format',
  format: ['strikethrough'],
  tag: '~',
};

// Export writes the first transformer of a format, so `~~` comes before `~`.
export const richTextareaTransformers: Transformer[] = [
  INLINE_CODE,
  BOLD_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  STRIKETHROUGH,
  SINGLE_TILDE_STRIKETHROUGH,
  LINK,
];

/*
 * Lexical backslash-escapes markdown characters in plain text on export, and has no option to stop.
 * The draft is sent exactly as shown (ADR-0012), so each export swaps those characters for stand-ins
 * the draft does not contain, lets Lexical format the text, and swaps them back.
 */
const markdownCharacters = ['*', '_', '`', '~', '\\'];
const firstStandIn = 0xfd_d0;

interface Swap {
  shield: (text: string) => string;
  unshield: (markdown: string) => string;
}

function unusedCharacters(text: string, count: number): string[] {
  const found: string[] = [];
  let point = firstStandIn;
  while (found.length < count) {
    const character = String.fromCodePoint(point);
    if (!text.includes(character)) found.push(character);
    point += 1;
  }
  return found;
}

function replacer(from: string[], to: string[]): (value: string) => string {
  return (value) =>
    Array.from(value, (character) => {
      const index = from.indexOf(character);
      return index === -1 ? character : to[index];
    }).join('');
}

function swapFor(text: string): Swap {
  const standIns = unusedCharacters(text, markdownCharacters.length);
  return {
    shield: replacer(markdownCharacters, standIns),
    unshield: replacer(standIns, markdownCharacters),
  };
}

function unescapedText({ shield }: Swap): TextMatchTransformer {
  return {
    type: 'text-match',
    dependencies: [],
    regExp: /$^/,
    export: (node, _exportChildren, exportFormat) =>
      $isTextNode(node) && !node.hasFormat('code')
        ? exportFormat(node, shield(node.getTextContent()))
        : null,
  };
}

export function $importMarkdown(markdown: string): void {
  $convertFromMarkdownString(markdown, richTextareaTransformers);
}

// Everything an export writes: the text, and the URLs links write beside it.
function $writtenText(): string {
  const texts = $getRoot().getAllTextNodes();
  const urls = texts.map((text) => text.getParent()).filter($isLinkNode);
  return [
    ...texts.map((text) => text.getTextContent()),
    ...urls.map((link) => link.getURL()),
  ].join('');
}

export function $exportMarkdown(): string {
  const swap = swapFor($writtenText());
  return swap.unshield(
    $convertToMarkdownString([
      ...richTextareaTransformers,
      unescapedText(swap),
    ]),
  );
}
