/*
 * Where the caret is when Return is pressed. A code block is empty when the caret ends it after two
 * empty lines, so the third Return in a row leaves it.
 */
export interface ReturnPlace {
  block: 'paragraph' | 'quote' | 'list-item' | 'code-block';
  empty: boolean;
}

export type ReturnAction =
  | 'send'
  | 'add-item'
  | 'leave-list'
  | 'add-line'
  | 'leave-code-block';

const actions: Record<
  ReturnPlace['block'],
  { filled: ReturnAction; empty: ReturnAction }
> = {
  paragraph: { filled: 'send', empty: 'send' },
  quote: { filled: 'send', empty: 'send' },
  'list-item': { filled: 'add-item', empty: 'leave-list' },
  'code-block': { filled: 'add-line', empty: 'leave-code-block' },
};

// Return sends, except in a list item and in a code block (ADR-0023). ⇧Return always adds a line.
export function returnAction({ block, empty }: ReturnPlace): ReturnAction {
  return empty ? actions[block].empty : actions[block].filled;
}
