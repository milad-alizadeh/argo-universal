import { describe, expect, it } from 'vitest';
import { renamedTitle } from './renamed-title';

const current = 'Build the Session layout';

describe('the title a rename saves', () => {
  it('is the typed title without its outer spaces', () => {
    expect(renamedTitle('  Port the mock CLIs ', current)).toBe(
      'Port the mock CLIs',
    );
  });

  it.each([
    ['an empty title', ''],
    ['a blank title', '   '],
    ['the same title', current],
    ['the same title with outer spaces', ` ${current}  `],
  ])('is nothing for %s', (_case, draft) => {
    expect(renamedTitle(draft, current)).toBeUndefined();
  });
});
