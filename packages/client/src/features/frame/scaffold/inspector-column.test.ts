import { describe, expect, it, type Mock, vi } from 'vitest';
import type { InspectorState } from './frame-layout';
import {
  hostedChange,
  hostedInspectorState,
  inspectorOffered,
  type InspectorColumn,
  moveInspector,
  nextInspectorState,
  shownInspectorState,
} from './inspector-column';

type ChangeInspector = (state: InspectorState) => void;

function column(
  inspectorState: InspectorState,
  rest: Partial<Pick<InspectorColumn, 'inspectorAvailable' | 'band'>> = {},
): InspectorColumn & { onInspectorStateChange: Mock<ChangeInspector> } {
  return {
    inspectorState,
    onInspectorStateChange: vi.fn<ChangeInspector>(),
    ...rest,
  };
}

describe('the band toggle', () => {
  it('opens a closed column and closes an open or expanded one', () => {
    expect(nextInspectorState('closed', 'toggle')).toBe('open');
    expect(nextInspectorState('open', 'toggle')).toBe('closed');
    expect(nextInspectorState('expanded', 'toggle')).toBe('closed');
  });

  it('opens through the page when it offers an opener', () => {
    const onInspectorToggle = vi.fn<() => void>();
    const closed = column('closed', { band: { onInspectorToggle } });
    moveInspector(closed, 'toggle');
    expect(onInspectorToggle).toHaveBeenCalledOnce();
    expect(closed.onInspectorStateChange).not.toHaveBeenCalled();
  });

  it('closes without asking the page', () => {
    const onInspectorToggle = vi.fn<() => void>();
    const open = column('open', { band: { onInspectorToggle } });
    moveInspector(open, 'toggle');
    expect(open.onInspectorStateChange).toHaveBeenCalledWith('closed');
    expect(onInspectorToggle).not.toHaveBeenCalled();
  });

  it('opens the column itself when the page has no opener', () => {
    const closed = column('closed');
    moveInspector(closed, 'toggle');
    expect(closed.onInspectorStateChange).toHaveBeenCalledWith('open');
  });
});

describe('expanding', () => {
  it('expands an open column and restores an expanded one', () => {
    const open = column('open');
    moveInspector(open, { expanded: true });
    expect(open.onInspectorStateChange).toHaveBeenCalledWith('expanded');

    const expanded = column('expanded');
    moveInspector(expanded, { expanded: false });
    expect(expanded.onInspectorStateChange).toHaveBeenCalledWith('open');
  });

  it('tells nobody when the column already agrees', () => {
    const expanded = column('expanded');
    moveInspector(expanded, { expanded: true });
    expect(expanded.onInspectorStateChange).not.toHaveBeenCalled();
  });
});

describe('a divider drag', () => {
  it('closes or expands the column from its outcome', () => {
    expect(nextInspectorState('open', { dragged: 'closed' })).toBe('closed');
    expect(nextInspectorState('open', { dragged: 'expanded' })).toBe(
      'expanded',
    );
  });

  it('reopens a closed or expanded column beside the page at a width', () => {
    expect(nextInspectorState('closed', { dragged: 400 })).toBe('open');
    expect(nextInspectorState('expanded', { dragged: 400 })).toBe('open');
  });

  it('leaves an open column alone while it is resized', () => {
    const open = column('open');
    moveInspector(open, { dragged: 400 });
    expect(open.onInspectorStateChange).not.toHaveBeenCalled();
  });

  it('reopens by drag without going through the page', () => {
    const onInspectorToggle = vi.fn<() => void>();
    const closed = column('closed', { band: { onInspectorToggle } });
    moveInspector(closed, { dragged: 400 });
    expect(closed.onInspectorStateChange).toHaveBeenCalledWith('open');
    expect(onInspectorToggle).not.toHaveBeenCalled();
  });
});

describe('off a wide window', () => {
  it('keeps the column closed whatever was asked', () => {
    expect(shownInspectorState('compact', 'open')).toBe('closed');
    expect(shownInspectorState('medium', 'expanded')).toBe('closed');
  });

  it('shows the asked state on a wide window', () => {
    expect(shownInspectorState('wide', 'expanded')).toBe('expanded');
  });
});

describe('what the band offers', () => {
  it('offers the column when the page has an Inspector or an opener', () => {
    expect(inspectorOffered(column('closed'))).toBe(true);

    expect(
      inspectorOffered(
        column('closed', {
          inspectorAvailable: false,
          band: { onInspectorToggle: vi.fn<() => void>() },
        }),
      ),
    ).toBe(true);
  });

  it('offers nothing when the page has neither', () => {
    expect(
      inspectorOffered(column('closed', { inspectorAvailable: false })),
    ).toBe(false);
  });
});

describe('the hosted page', () => {
  it('is open beside the page unless the Frame expanded it', () => {
    expect(hostedInspectorState(true, false)).toBe('open');
    expect(hostedInspectorState(true, true)).toBe('expanded');
    expect(hostedInspectorState(false, true)).toBe('closed');
  });

  it('is told only when its open state differs from the move', () => {
    expect(hostedChange(true, 'expanded')).toEqual({
      expanded: true,
      open: null,
    });

    expect(hostedChange(true, 'closed')).toEqual({
      expanded: false,
      open: false,
    });

    expect(hostedChange(false, 'open')).toEqual({
      expanded: false,
      open: true,
    });
  });
});
