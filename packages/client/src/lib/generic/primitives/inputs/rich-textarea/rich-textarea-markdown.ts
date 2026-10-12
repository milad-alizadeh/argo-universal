import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_STAR,
  INLINE_CODE,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import { $getRoot, $isTextNode, type Klass, type LexicalNode } from 'lexical';

/*
 * The nodes and markdown transformers the web editor uses, shared by its drawing and its tests.
 * Block nodes (lists, quotes, code blocks) and links join these lists as the editor grows.
 */
export const richTextareaNodes: Klass<LexicalNode>[] = [];

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
  STRIKETHROUGH,
  SINGLE_TILDE_STRIKETHROUGH,
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
  const pattern = new RegExp(
    `[${from.map((character) => RegExp.escape(character)).join('')}]`,
    'gu',
  );
  return (value) =>
    value.replaceAll(
      pattern,
      (character) => to[from.indexOf(character)] ?? character,
    );
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

export function $exportMarkdown(): string {
  const swap = swapFor($getRoot().getTextContent());
  return swap.unshield(
    $convertToMarkdownString([
      ...richTextareaTransformers,
      unescapedText(swap),
    ]),
  );
}
