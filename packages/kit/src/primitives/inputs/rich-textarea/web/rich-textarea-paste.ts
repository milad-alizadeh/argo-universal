import { LinkNode } from '@lexical/link';
import { ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import {
  $hasUpdateTag,
  type ElementNode,
  type LexicalEditor,
  PASTE_TAG,
  ParagraphNode,
  TEXT_TYPE_TO_FORMAT,
  TextNode,
} from 'lexical';
import { isLinkUrl } from '#kit/link-url';
import { markdownMarks as marks } from '#kit/markdown-marks';

// The marks markdown can write; underline, highlight, subscript, superscript and case changes cannot.
const markdownMarks = marks.reduce(
  (mask, mark) => mask | (TEXT_TYPE_TO_FORMAT[mark] ?? 0),
  0,
);

const hasOtherMarks = (format: number): boolean =>
  (format & ~markdownMarks) !== 0;

// One kind of formatting markdown cannot write: whether a node has it, and how to take it off.
interface Strip<T> {
  has: (node: T) => boolean;
  clear: (node: T) => void;
}

// A setter marks a node changed even when the value is the same, so each strip runs only when needed.
function $strip<T>(node: T, strips: Strip<T>[]): void {
  for (const { has, clear } of strips) if (has(node)) clear(node);
}

const textStrips: Strip<TextNode>[] = [
  {
    has: (text) => hasOtherMarks(text.getFormat()),
    clear: (text) => text.setFormat(text.getFormat() & markdownMarks),
  },
  { has: (text) => text.getStyle() !== '', clear: (text) => text.setStyle('') },
];

// Alignment, colours and fonts on a block, and the marks it gives new text.
const blockStrips: Strip<ElementNode>[] = [
  {
    has: (block) => block.getFormatType() !== '',
    clear: (block) => block.setFormat(''),
  },
  {
    has: (block) => block.getStyle() !== '',
    clear: (block) => block.setStyle(''),
  },
  {
    has: (block) => block.getTextStyle() !== '',
    clear: (block) => block.setTextStyle(''),
  },
  {
    has: (block) => hasOtherMarks(block.getTextFormat()),
    clear: (block) =>
      block.setTextFormat(block.getTextFormat() & markdownMarks),
  },
];

// Markdown has no indented paragraph or quote; a list item's indent is its nesting, so it stays.
const unindentedBlockStrips: Strip<ElementNode>[] = [
  ...blockStrips,
  {
    has: (block) => block.getIndent() !== 0,
    clear: (block) => block.setIndent(0),
  },
];

const $plainText = (text: TextNode): void => $strip(text, textStrips);

const $plainBlock = (block: ElementNode): void => $strip(block, blockStrips);

const $plainUnindentedBlock = (block: ElementNode): void =>
  $strip(block, unindentedBlockStrips);

function $unwrap(link: LinkNode): void {
  for (const child of link.getChildren()) link.insertBefore(child);
  link.remove();
}

// Markdown writes a link's text and URL only, so a pasted title, rel or target goes.
const pastedLinkStrips: Strip<LinkNode>[] = [
  {
    has: (link) => link.getTitle() !== null,
    clear: (link) => link.setTitle(null),
  },
  { has: (link) => link.getRel() !== null, clear: (link) => link.setRel(null) },
  {
    has: (link) => link.getTarget() !== null,
    clear: (link) => link.setTarget(null),
  },
];

/*
 * A pasted link Argo does not follow (only http, https and mailto) keeps its text as plain text; a
 * link around only an image has nothing left to show once the image is dropped.
 */
function $plainPastedLink(link: LinkNode): void {
  if (link.isEmpty() || !isLinkUrl(link.getURL())) $unwrap(link);
  else $strip(link, pastedLinkStrips);
}

// Links typed, saved with the link editor or restored with a draft stay as they are.
function $plainLink(link: LinkNode): void {
  if ($hasUpdateTag(PASTE_TAG)) $plainPastedLink(link);
}

/*
 * The field holds only what markdown can express. Lexical's HTML import already drops tables and
 * images, since their nodes are not registered; this strips the formatting it keeps.
 */
export function registerMarkdownOnly(editor: LexicalEditor): () => void {
  const unregister = [
    editor.registerNodeTransform(TextNode, $plainText),
    editor.registerNodeTransform(ParagraphNode, $plainUnindentedBlock),
    editor.registerNodeTransform(HeadingNode, $plainUnindentedBlock),
    editor.registerNodeTransform(QuoteNode, $plainUnindentedBlock),
    editor.registerNodeTransform(ListItemNode, $plainBlock),
    editor.registerNodeTransform(LinkNode, $plainLink),
  ];

  return () => {
    for (const stop of unregister) stop();
  };
}
