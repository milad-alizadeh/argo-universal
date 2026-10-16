import { describe, expect, it, vi } from 'vitest';
import type { SheetProps } from './sheet-props';
import { popPage, pushPage, sheetDetents, sheetReports } from './sheet-state';

type Reported = Pick<SheetProps, 'open' | 'onOpenChange' | 'onClosed'>;

function sheetProps(): Reported {
  return {
    open: true,
    onOpenChange: vi.fn<SheetProps['onOpenChange']>(),
    onClosed: vi.fn<NonNullable<SheetProps['onClosed']>>(),
  };
}

describe('sheet presentation reports', () => {
  it('reports a dismissal once even when the platform reports it twice', () => {
    const props = sheetProps();
    const reports = sheetReports(() => props);
    reports.dismissed();
    reports.dismissed();
    reports.closed();
    reports.closed();
    expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(props.onClosed).toHaveBeenCalledTimes(1);
  });

  it('does not turn an answered sheet closing into a dismissal', () => {
    const props = { ...sheetProps(), open: false };
    const reports = sheetReports(() => props);
    reports.dismissed();
    reports.closed();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(props.onClosed).toHaveBeenCalledTimes(1);
  });
});

describe('sheet pages', () => {
  it('pushes a page once and goes back to the root', () => {
    const pushed = pushPage(pushPage([], 'model'), 'model');
    expect(pushed).toEqual(['model']);
    expect(popPage(pushed)).toEqual([]);
  });

  it('rests a sheet with pages at medium and large unless it names its own', () => {
    expect(sheetDetents({ paged: true })).toEqual(['medium', 'large']);
    expect(sheetDetents({ paged: true, detents: ['large'] })).toEqual([
      'large',
    ]);
    expect(sheetDetents({ paged: false })).toBeUndefined();
  });
});
