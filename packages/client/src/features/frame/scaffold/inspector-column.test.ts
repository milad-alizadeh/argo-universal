import { describe, expect, it, type Mock, vi } from 'vitest';
import type { InspectorState } from './frame-layout';
import {
  hostedChange,
  hostedInspectorState,
  inspectorOffered,
  type InspectorColumnState,
  type InspectorOpener,
  moveInspector,
  nextInspectorState,
  shownInspectorState,
} from './inspector-column';

type ChangeInspector = (state: InspectorState) => void;

// A page that owns a Session and opens its own Inspector.
const opens = (onInspectorToggle: () => void): InspectorOpener => ({
  band: { session: { onInspectorToggle } },
});

function column(
  inspectorState: InspectorState,
  opener: InspectorOpener = {},
): InspectorColumnState &
  InspectorOpener & { onInspectorStateChange: Mock<ChangeInspector> } {
  return {
    inspectorState,
    onInspectorStateChange: vi.fn<ChangeInspector>(),
    ...opener,
  };
}

describe('the band toggle', () => {
  it.each([
    { from: 'closed', next: 'open' },
    { from: 'open', next: 'closed' },
    { from: 'expanded', next: 'closed' },
  ] as const)('moves a $from column to $next', ({ from, next }) => {
    expect(nextInspectorState(from, 'toggle')).toBe(next);
  });

  it('opens through the page when it offers an opener', () => {
    const onInspectorToggle = vi.fn<() => void>();
    const closed = column('closed', opens(onInspectorToggle));
    moveInspector(closed, 'toggle');
    expect(onInspectorToggle).toHaveBeenCalledOnce();
    expect(closed.onInspectorStateChange).not.toHaveBeenCalled();
  });

  it('closes without asking the page', () => {
    const onInspectorToggle = vi.fn<() => void>();
    const open = column('open', opens(onInspectorToggle));
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
  it.each([
    { from: 'open', expanded: true, next: 'expanded' },
    { from: 'expanded', expanded: false, next: 'open' },
  ] as const)(
    'tells the Frame $next when a $from column is asked to expand: $expanded',
    ({ from, expanded, next }) => {
      const asked = column(from);
      moveInspector(asked, { expanded });
      expect(asked.onInspectorStateChange).toHaveBeenCalledWith(next);
    },
  );

  it('tells nobody when the column already agrees', () => {
    const expanded = column('expanded');
    moveInspector(expanded, { expanded: true });
    expect(expanded.onInspectorStateChange).not.toHaveBeenCalled();
  });
});

describe('a divider drag', () => {
  it.each([
    { from: 'open', dragged: 'closed', next: 'closed' },
    { from: 'open', dragged: 'expanded', next: 'expanded' },
    { from: 'closed', dragged: 400, next: 'open' },
    { from: 'expanded', dragged: 400, next: 'open' },
  ] as const)(
    'moves a $from column to $next when the drag ends at $dragged',
    ({ from, dragged, next }) => {
      expect(nextInspectorState(from, { dragged })).toBe(next);
    },
  );

  it('leaves an open column alone while it is resized', () => {
    const open = column('open');
    moveInspector(open, { dragged: 400 });
    expect(open.onInspectorStateChange).not.toHaveBeenCalled();
  });

  it('reopens by drag without going through the page', () => {
    const onInspectorToggle = vi.fn<() => void>();
    const closed = column('closed', opens(onInspectorToggle));
    moveInspector(closed, { dragged: 400 });
    expect(closed.onInspectorStateChange).toHaveBeenCalledWith('open');
    expect(onInspectorToggle).not.toHaveBeenCalled();
  });
});

describe('off a wide window', () => {
  it.each([
    { sizeClass: 'compact', asked: 'open', shown: 'closed' },
    { sizeClass: 'medium', asked: 'expanded', shown: 'closed' },
    { sizeClass: 'wide', asked: 'expanded', shown: 'expanded' },
  ] as const)(
    'shows $asked as $shown on a $sizeClass window',
    ({ sizeClass, asked, shown }) => {
      expect(shownInspectorState(sizeClass, asked)).toBe(shown);
    },
  );
});

describe('what the band offers', () => {
  it('offers the column when the page has an Inspector', () => {
    expect(inspectorOffered({ inspectorAvailable: true })).toBe(true);
  });

  it('offers the column when the page only has an opener', () => {
    const offer = {
      inspectorAvailable: false,
      ...opens(vi.fn<() => void>()),
    };

    expect(inspectorOffered(offer)).toBe(true);
  });

  it('offers nothing when the page has neither', () => {
    expect(inspectorOffered({ inspectorAvailable: false })).toBe(false);
  });
});

describe('the hosted page', () => {
  it.each([
    { open: true, expanded: false, state: 'open' },
    { open: true, expanded: true, state: 'expanded' },
    { open: false, expanded: true, state: 'closed' },
  ] as const)(
    'is $state when open is $open and the Frame expanded it: $expanded',
    ({ open, expanded, state }) => {
      expect(hostedInspectorState(open, expanded)).toBe(state);
    },
  );

  it.each([
    { open: true, next: 'expanded', change: { expanded: true, open: null } },
    { open: true, next: 'closed', change: { expanded: false, open: false } },
    { open: false, next: 'open', change: { expanded: false, open: true } },
  ] as const)(
    'is told $change.open when it is open: $open and the move is $next',
    ({ open, next, change }) => {
      expect(hostedChange(open, next)).toEqual(change);
    },
  );
});
