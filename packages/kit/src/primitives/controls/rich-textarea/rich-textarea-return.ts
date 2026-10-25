// The block the caret is in when Return is pressed.
export type ReturnBlock = 'paragraph' | 'quote' | 'list-item' | 'code-block';

/*
 * Return sends, except in a list item and in a code block, where Lexical adds an item or a line
 * (ADR-0023). ⇧Return always adds a line.
 */
export function sendsOnReturn({ block }: { block: ReturnBlock }): boolean {
  return block === 'paragraph' || block === 'quote';
}
