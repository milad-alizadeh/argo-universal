import { describe, expect, it } from 'vitest';
import { codeProps } from './prose-kit-props';

const diff = [
  {
    header: '@@ -1 +1 @@',
    lines: [
      { kind: 'removed', number: 1, text: 'before' },
      { kind: 'added', number: 1, text: 'after' },
    ],
  },
];

describe('Code wire input', () => {
  it.each([{ code: 'plain text' }, { diff }])(
    'accepts one source: %j',
    (props) => {
      expect(codeProps.parse(props)).toEqual(props);
    },
  );

  it.each([{}, { code: 'plain text', diff }])(
    'refuses missing or conflicting sources: %j',
    (props) => {
      expect(codeProps.safeParse(props).success).toBe(false);
    },
  );
});
