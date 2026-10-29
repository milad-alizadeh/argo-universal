import { $isCodeNode } from '@lexical/code';
import { $isLinkNode } from '@lexical/link';
import {
  $getRoot,
  $getSelection,
  $hasUpdateTag,
  $isRangeSelection,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type LexicalNode,
  PASTE_TAG,
  type RangeSelection,
  TextNode,
} from 'lexical';

// A spot in some text that names a token, and how to make that token.
export interface TypedToken {
  start: number;
  end: number;
  $create: () => LexicalNode;
}

// Finds the tokens a text names; `previous` is the character before the text, or '' at its start.
export type TokenFinder = (text: string, previous: string) => TypedToken[];

function isCaretAtEnd(selection: RangeSelection, node: TextNode): boolean {
  const { anchor } = selection;

  return (
    anchor.key === node.getKey() && anchor.offset === node.getTextContentSize()
  );
}

function $caretAtEnd(node: TextNode): boolean {
  const selection = $getSelection();

  return (
    $isRangeSelection(selection) &&
    selection.isCollapsed() &&
    isCaretAtEnd(selection, node)
  );
}

// A caret still at the end of the text is mid-way through typing the name; a paste is not typing.
function $typingAtEnd(node: TextNode): boolean {
  return !$hasUpdateTag(PASTE_TAG) && $caretAtEnd(node);
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

function $previousCharacter(node: TextNode): string {
  return node.getPreviousSibling()?.getTextContent().slice(-1) ?? '';
}

function $firstFound(
  node: TextNode,
  find: TokenFinder,
): TypedToken | undefined {
  const text = node.getTextContent();

  return find(text, $previousCharacter(node)).find(
    ({ end }) => end < text.length || !$typingAtEnd(node),
  );
}

function $replaceWithToken(node: TextNode, found: TypedToken): void {
  const parts = node.splitText(found.start, found.end);
  const matched = parts[found.start === 0 ? 0 : 1];
  matched?.replace(found.$create());
}

function $tokenize(node: TextNode, find: TokenFinder): void {
  if (!$isPlainSpot(node)) return;
  const found = $firstFound(node, find);

  if (found) $replaceWithToken(node, found);
}

function $retokenize(): void {
  for (const node of $getRoot().getAllTextNodes()) node.markDirty();
}

/*
 * Turns the names `find` spots in typed, pasted or loaded text into tokens, leaving a name alone
 * while it is being typed.
 */
export function registerTypedTokens(
  editor: LexicalEditor,
  find: TokenFinder,
): () => void {
  const unregister = editor.registerNodeTransform(TextNode, (node) =>
    $tokenize(node, find),
  );

  editor.update($retokenize, { tag: HISTORY_MERGE_TAG });

  return unregister;
}
