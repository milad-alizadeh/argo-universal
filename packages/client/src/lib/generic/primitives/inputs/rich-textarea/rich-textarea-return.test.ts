import { describe, expect, it } from 'vitest';
import { type ReturnPlace, returnAction } from './rich-textarea-return';

// ADR-0023 and #544: what one Return does, by the block the caret is in and whether that block is empty.
const table: { place: ReturnPlace; action: ReturnType<typeof returnAction> }[] =
  [
    { place: { block: 'paragraph', empty: false }, action: 'send' },
    { place: { block: 'paragraph', empty: true }, action: 'send' },
    { place: { block: 'quote', empty: false }, action: 'send' },
    { place: { block: 'quote', empty: true }, action: 'send' },
    { place: { block: 'list-item', empty: false }, action: 'add-item' },
    { place: { block: 'list-item', empty: true }, action: 'leave-list' },
    { place: { block: 'code-block', empty: false }, action: 'add-line' },
    { place: { block: 'code-block', empty: true }, action: 'leave-code-block' },
  ];

describe('Return in the RichTextarea', () => {
  it.each(table)(
    'in a $place.block (empty: $place.empty) does $action',
    ({ place, action }) => {
      expect(returnAction(place)).toBe(action);
    },
  );
});
