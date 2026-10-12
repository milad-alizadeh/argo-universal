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
import { $isTextNode, type Klass, type LexicalNode } from 'lexical';

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
 * Lexical backslash-escapes markdown characters in plain text on export. The draft is sent exactly
 * as shown (ADR-0012), so those characters pass through export as Unicode noncharacters and come back after.
 */
const firstNoncharacter = 0xfd_d0;
const standIns = new Map(
  ['*', '_', '`', '~', '\\'].map((character, index) => [
    character,
    String.fromCodePoint(firstNoncharacter + index),
  ]),
);
const originals = new Map(
  [...standIns].map(([character, standIn]) => [standIn, character]),
);

function shield(text: string): string {
  return text.replaceAll(
    /[*_`~\\]/g,
    (character) => standIns.get(character) ?? character,
  );
}

function unshield(markdown: string): string {
  return markdown.replaceAll(
    /[\uFDD0-\uFDD4]/g,
    (standIn) => originals.get(standIn) ?? standIn,
  );
}

const unescapedText: TextMatchTransformer = {
  type: 'text-match',
  dependencies: [],
  regExp: /$^/,
  export: (node, _exportChildren, exportFormat) =>
    $isTextNode(node) && !node.hasFormat('code')
      ? exportFormat(node, shield(node.getTextContent()))
      : null,
};

export function $importMarkdown(markdown: string): void {
  $convertFromMarkdownString(markdown, richTextareaTransformers);
}

export function $exportMarkdown(): string {
  return unshield(
    $convertToMarkdownString([...richTextareaTransformers, unescapedText]),
  );
}
