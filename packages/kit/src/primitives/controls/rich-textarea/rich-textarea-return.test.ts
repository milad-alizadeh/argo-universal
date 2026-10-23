import { describe, expect, it } from 'vitest';
import { type ReturnBlock, sendsOnReturn } from './rich-textarea-return';

// ADR-0023: whether one Return sends, by the block the caret is in.
const table: { block: ReturnBlock; sends: boolean }[] = [
  { block: 'paragraph', sends: true },
  { block: 'quote', sends: true },
  { block: 'list-item', sends: false },
  { block: 'code-block', sends: false },
];

describe('Return in the RichTextarea', () => {
  it.each(table)('in a $block sends: $sends', ({ block, sends }) => {
    expect(sendsOnReturn({ block })).toBe(sends);
  });
});
