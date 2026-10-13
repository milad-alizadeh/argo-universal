// The block the caret is in when Return is pressed.
export type ReturnBlock =
  | 'paragraph'
  | 'heading'
  | 'quote'
  | 'list-item'
  | 'code-block';

/*
 * Return sends, except in a heading, a list item and a code block, where Lexical starts the next
 * paragraph, adds an item or a line (ADR-0023). ⇧Return adds a line, and leaves a heading or list item
 * for the next paragraph or item.
 */
export function sendsOnReturn({ block }: { block: ReturnBlock }): boolean {
  return block === 'paragraph' || block === 'quote';
}
