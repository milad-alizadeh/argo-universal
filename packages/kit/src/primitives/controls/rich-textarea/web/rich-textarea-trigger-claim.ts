import { $isTextNode, type LexicalNode, type TextNode } from 'lexical';

const endingWord = (text: string): string => text.split(/\s/).at(-1) ?? '';

function $simpleTextBefore(node: TextNode): TextNode | null {
  const previous: LexicalNode | null = node.getPreviousSibling();

  return $isTextNode(previous) && previous.isSimpleText() ? previous : null;
}

function $moveQueryFront(to: TextNode): void {
  const from = $simpleTextBefore(to);

  if (!from) return;
  const text = from.getTextContent();
  const front = endingWord(text);
  from.setTextContent(text.slice(0, text.length - front.length));
  to.setTextContent(front + to.getTextContent());
}

/*
 * The menu cuts the typed query out of the text from the last query it was told about. A letter that
 * lands before the menu hears of it leaves the cut short, and the front of the word stays behind as text.
 * The query is one word, so what precedes the cut in the same word is the rest of it.
 */
export function $restoreQueryFront(node: TextNode | null): void {
  if (node) $moveQueryFront(node);
}
