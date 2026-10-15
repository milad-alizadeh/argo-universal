import { describe, expect, it, vi } from 'vitest';
import { blurOnFocusLoss } from './focus-loss';

describe('a native field reporting its focus', () => {
  it.each([
    { story: 'only its first unfocused state', changes: [false], blurs: 0 },
    { story: 'focus without leaving', changes: [false, true], blurs: 0 },
    { story: 'focus, then leaving', changes: [false, true, false], blurs: 1 },
    {
      story: 'two visits',
      changes: [true, false, true, false],
      blurs: 2,
    },
  ])('blurs the form field $blurs times after $story', (row) => {
    const onBlur = vi.fn<() => void>();
    const report = blurOnFocusLoss();

    for (const focused of row.changes) report(focused, onBlur);
    expect(onBlur).toHaveBeenCalledTimes(row.blurs);
  });

  it('blurs through the newest callback when the form rerenders during a visit', () => {
    const first = vi.fn<() => void>();
    const rerendered = vi.fn<() => void>();
    const report = blurOnFocusLoss();

    report(true, first);
    report(false, rerendered);
    expect(first).not.toHaveBeenCalled();
    expect(rerendered).toHaveBeenCalledOnce();
  });
});
