import { describe, expect, it } from 'vitest';
import {
  marksAfterPasting,
  roundTripWithPasteCleanUp,
} from './rich-textarea-headless.mocks';

// Lexical draws underline as a theme class, so only the editor's text nodes show it is gone.
const pastedMarks = [
  { pasted: 'underline', html: '<u>under</u>', marks: [[]] },
  {
    pasted: 'a case change',
    html: '<span style="text-transform: uppercase">loud</span>',
    marks: [[]],
  },
  {
    pasted: 'bold underline',
    html: '<b><u>both</u></b>',
    marks: [['bold']],
  },
];

describe('RichTextarea paste', () => {
  it.each(pastedMarks)(
    'keeps only markdown marks from pasted $pasted',
    ({ html, marks }) => {
      expect(marksAfterPasting(html)).toEqual(marks);
    },
  );

  // Only a paste loses links Argo does not follow; a typed or restored draft keeps them.
  it.each([
    '[docs](./README.md)',
    '[a](#top)',
    '[files](sftp://argo.dev/files)',
  ])('keeps the relative or other link %s in a draft', (markdown) => {
    expect(roundTripWithPasteCleanUp(markdown)).toBe(markdown);
  });
});
