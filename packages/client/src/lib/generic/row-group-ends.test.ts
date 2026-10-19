import { describe, expect, it, vi } from 'vitest';
import { createRowGroupEnds } from './row-group-ends';

describe('createRowGroupEnds', () => {
  it('tells the row after a marked row that it opens a new group', () => {
    const groupEnds = createRowGroupEnds();
    groupEnds.mark(0, true);

    expect(groupEnds.ends(0)).toBe(true);
    expect(groupEnds.ends(1)).toBe(false);
  });

  it('notifies only when a row starts or stops ending its group', () => {
    const groupEnds = createRowGroupEnds();
    const listener = vi.fn<() => void>();
    groupEnds.subscribe(listener);

    groupEnds.mark(2, true);
    groupEnds.mark(2, true);
    groupEnds.mark(2, false);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(groupEnds.ends(2)).toBe(false);
  });
});
