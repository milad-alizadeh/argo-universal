import { $isCodeNode } from '@lexical/code';
import { $isLinkNode } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
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
  SKIP_DOM_SELECTION_TAG,
  TextNode,
} from 'lexical';
import { useEffect, useRef } from 'react';

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

function $hasTokenToMake(find: TokenFinder): boolean {
  return $getRoot()
    .getAllTextNodes()
    .some(
      (node) => $isPlainSpot(node) && $firstFound(node, find) !== undefined,
    );
}

function $retokenize(): void {
  for (const node of $getRoot().getAllTextNodes()) node.markDirty();
}

const isFocused = (editor: LexicalEditor): boolean =>
  Boolean(editor.getRootElement()?.contains(document.activeElement));

/*
 * Turns the names `find` spots in typed, pasted or loaded text into tokens, leaving a name alone
 * while it is being typed. Register it once per editor and read the names as they change: each
 * registration runs an editor update of Lexical's own.
 */
function registerTypedTokens(
  editor: LexicalEditor,
  find: TokenFinder,
): () => void {
  return editor.registerNodeTransform(TextNode, (node) =>
    $tokenize(node, find),
  );
}

/*
 * Reads the text again after the names change. Every editor update makes the typeahead look for
 * its trigger and may write the selection back to the page, so this updates only when a name would
 * become a token, and an editor out of focus keeps its DOM selection: a list arriving while the
 * person is elsewhere never opens the menu or pulls focus into the editor.
 */
function retokenize(editor: LexicalEditor, find: TokenFinder): void {
  if (!editor.read(() => $hasTokenToMake(find))) return;

  const tags = isFocused(editor)
    ? [HISTORY_MERGE_TAG]
    : [HISTORY_MERGE_TAG, SKIP_DOM_SELECTION_TAG];

  editor.update($retokenize, { tag: tags });
}

// One token transform per editor, reading the names `find` spots now; new names re-read the text.
export function useTypedTokens(find: TokenFinder): void {
  const [editor] = useLexicalComposerContext();
  const current = useRef(find);
  useEffect(
    () =>
      registerTypedTokens(editor, (text, previous) =>
        current.current(text, previous),
      ),
    [editor],
  );
  useEffect(() => {
    current.current = find;
    retokenize(editor, find);
  }, [editor, find]);
}
