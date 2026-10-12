import { describe, expect, it } from 'vitest';
import { marksAfterPasting } from '../../../../../../mocks/rich-textarea-headless';

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
});
