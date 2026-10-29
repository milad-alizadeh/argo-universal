import { CodeNode } from '@lexical/code';
import { $isLinkNode, AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import {
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ELEMENT_TRANSFORMERS,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  MULTILINE_ELEMENT_TRANSFORMERS,
  STRIKETHROUGH,
  TEXT_MATCH_TRANSFORMERS,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $getRoot, $isTextNode, type Klass, type LexicalNode } from 'lexical';
import { CommandNode } from './rich-textarea-command-node';
import { $importLiteralMarkdown } from './rich-textarea-import';
import { ReferenceNode } from './rich-textarea-reference-node';
import { replacer, unusedCharacters } from './rich-textarea-stand-ins';

// The nodes and markdown transformers the web editor uses, shared by its drawing and its tests.
export const richTextareaNodes: Klass<LexicalNode>[] = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  LinkNode,
  AutoLinkNode,
  ReferenceNode,
  CommandNode,
];

const SINGLE_TILDE_STRIKETHROUGH: TextFormatTransformer = {
  type: 'text-format',
  format: ['strikethrough'],
  tag: '~',
};

/*
 * Lexical's TRANSFORMERS preset, less `==` highlight, which the Feed cannot draw. Export writes the
 * first transformer of a format, so `**`, `_` and `~~` come before the other spellings.
 */
export const richTextareaTransformers: Transformer[] = [
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_UNDERSCORE,
  ITALIC_STAR,
  STRIKETHROUGH,
  SINGLE_TILDE_STRIKETHROUGH,
  ...TEXT_MATCH_TRANSFORMERS,
];

/*
 * Lexical backslash-escapes markdown characters in plain text on export, and has no option to stop.
 * The draft is sent exactly as shown (ADR-0012), so each export swaps those characters for stand-ins
 * the draft does not contain, lets Lexical format the text, and swaps them back. Only a link's text
 * is escaped, where a bracket or a final backslash would end it early.
 */
const markdownCharacters = ['*', '_', '`', '~', '\\'];

const linkTextCharacters = /[[\]]|\\(?=[!-/:-@[-`{-~]|$)/g;

interface Swap {
  shield: (text: string) => string;
  unshield: (markdown: string) => string;
}

function swapFor(text: string): Swap {
  const standIns = unusedCharacters(text, markdownCharacters.length);

  return {
    shield: replacer(markdownCharacters, standIns),
    unshield: replacer(standIns, markdownCharacters),
  };
}

function $writtenText(node: LexicalNode): string {
  const text = node.getTextContent();

  return $isLinkNode(node.getParent())
    ? text.replaceAll(linkTextCharacters, '\\$&')
    : text;
}

function unescapedText({ shield }: Swap): TextMatchTransformer {
  return {
    type: 'text-match',
    dependencies: [],
    regExp: /$^/,
    export: (node, _exportChildren, exportFormat) =>
      $isTextNode(node) && !node.hasFormat('code')
        ? exportFormat(node, shield($writtenText(node)))
        : null,
  };
}

export function $importMarkdown(markdown: string): void {
  $importLiteralMarkdown(markdown, richTextareaTransformers);
}

// Everything an export writes: the text, and the URLs links write beside it.
function $everythingWritten(): string {
  const texts = $getRoot().getAllTextNodes();
  const urls = texts.map((text) => text.getParent()).filter($isLinkNode);

  return [
    ...texts.map((text) => text.getTextContent()),
    ...urls.map((link) => link.getURL()),
  ].join('');
}

export function $exportMarkdown(): string {
  const swap = swapFor($everythingWritten());

  return swap.unshield(
    $convertToMarkdownString([
      ...richTextareaTransformers,
      unescapedText(swap),
    ]),
  );
}

/*
 * What typing turns into blocks: the same transformers, less `#` headings. `#` is reserved for Issue
 * and pull request references, so it stays the text typed; a pasted heading still imports and exports.
 */
export const richTextareaShortcuts: Transformer[] =
  richTextareaTransformers.filter((transformer) => transformer !== HEADING);
