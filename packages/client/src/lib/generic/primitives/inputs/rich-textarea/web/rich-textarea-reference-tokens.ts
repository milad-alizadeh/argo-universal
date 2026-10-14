import { $isCodeNode } from '@lexical/code';
import { $isLinkNode } from '@lexical/link';
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type RangeSelection,
  TextNode,
} from 'lexical';
import type { ReferenceOption } from '../rich-textarea-references';
import { $createReferenceNode } from './rich-textarea-reference-node';

// `#123` after a space or a bracket, and before a space or the end of the text.
const typedReference = /(?<![^\s(])#(\d+)(?=\s|$)/g;

interface Found {
  start: number;
  end: number;
  number: number;
}

function foundIn(text: string, known: ReadonlySet<number>): Found[] {
  return [...text.matchAll(typedReference)].flatMap((match) => {
    const number = Number(match[1]);
    const end = match.index + match[0].length;

    return known.has(number) ? [{ start: match.index, end, number }] : [];
  });
}

function isCaretAtEnd(selection: RangeSelection, node: TextNode): boolean {
  const { anchor } = selection;

  return (
    anchor.key === node.getKey() && anchor.offset === node.getTextContentSize()
  );
}

// A caret still at the end of the text is mid-way through typing the number.
function $typingAtEnd(node: TextNode): boolean {
  const selection = $getSelection();

  return (
    $isRangeSelection(selection) &&
    selection.isCollapsed() &&
    isCaretAtEnd(selection, node)
  );
}

function $inLiteralBlock(node: TextNode): boolean {
  const parent = node.getParent();

  return $isLinkNode(parent) || $isCodeNode(parent);
}

function $isPlainSpot(node: TextNode): boolean {
  return (
    node.isSimpleText() && !node.hasFormat('code') && !$inLiteralBlock(node)
  );
}

function $firstFound(
  node: TextNode,
  known: ReadonlySet<number>,
): Found | undefined {
  const text = node.getTextContent();

  return foundIn(text, known).find(
    ({ end }) => end < text.length || !$typingAtEnd(node),
  );
}

function $replaceWithToken(node: TextNode, found: Found): void {
  const parts = node.splitText(found.start, found.end);
  const matched = parts[found.start === 0 ? 0 : 1];
  matched?.replace($createReferenceNode(found.number));
}

function $tokenize(node: TextNode, known: ReadonlySet<number>): void {
  if (!$isPlainSpot(node)) return;
  const found = $firstFound(node, known);

  if (found) $replaceWithToken(node, found);
}

function $retokenize(): void {
  for (const node of $getRoot().getAllTextNodes()) node.markDirty();
}

/*
 * A typed `#123` that names a known Issue or pull request becomes a token, so a draft loaded with
 * `#443` in it shows the token too. The number is left alone while it is being typed.
 */
export function registerReferenceTokens(
  editor: LexicalEditor,
  references: readonly ReferenceOption[],
): () => void {
  const known = new Set(references.map(({ number }) => number));

  const unregister = editor.registerNodeTransform(TextNode, (node) =>
    $tokenize(node, known),
  );

  editor.update($retokenize, { tag: HISTORY_MERGE_TAG });

  return unregister;
}

// What choosing an option leaves: the token and a space after it, the caret past both.
export function $insertReference(
  node: TextNode | null,
  option: ReferenceOption,
): void {
  const space = $createTextNode(' ');
  const token = $createReferenceNode(option.number);
  node?.replace(token);
  token.insertAfter(space);
  space.selectEnd();
}
