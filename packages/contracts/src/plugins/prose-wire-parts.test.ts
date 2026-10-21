import { describe, expect, it } from 'vitest';
import { proseWireParts } from './prose-wire-parts';

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
      expect(proseWireParts.Code.props.parse(props)).toEqual(props);
    },
  );

  it.each([{}, { code: 'plain text', diff }])(
    'refuses missing or conflicting sources: %j',
    (props) => {
      expect(proseWireParts.Code.props.safeParse(props).success).toBe(false);
    },
  );
});
