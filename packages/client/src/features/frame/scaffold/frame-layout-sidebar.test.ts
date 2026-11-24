import { expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

const autoHidden = 'auto-hidden';

it.each([
  { width: 1180, inspectorState: 'closed' as const },
  { width: 1440, inspectorState: 'open' as const },
])(
  'the sidebar takes priority over the Workbench at $width with the Inspector $inspectorState',
  (state) => {
    const layout = frameLayout({ ...input, ...state, sidebarRequested: false });

    expect(layout.list.width).toBe(312);
    expect(layout.workbench.state).toBe(autoHidden);
    expect(layout.page.width).toBeGreaterThanOrEqual(688);
  },
);

it('clamps a wider sidebar preference while preserving room to show its minimum', () => {
  const layout = frameLayout({
    ...input,
    width: 1100,
    sidebarRequested: true,
    preferredListWidth: 460,
  });

  expect(layout.list.width).toBe(340);
  expect(layout.page.width).toBe(688);
});

it('budgets no Workbench when resizing the sidebar to its end', () => {
  const maximum = frameLayout(input).handles.list?.maximum;
  const resized = frameLayout({ ...input, preferredListWidth: maximum ?? 0 });

  expect(maximum).toBe(460);
  expect(resized.list.folded).toBe(false);
  expect(resized.workbench.state).toBe(autoHidden);
  expect(resized.page.width).toBe(908);
});

it('keeps a requested list folded while the content and the Inspector need its room', () => {
  const layout = frameLayout({
    ...input,
    width: 1300,
    inspectorState: 'open',
    sidebarRequested: true,
  });

  expect(layout.list.folded).toBe(true);
});

it('restores the Workbench when closing the Inspector frees enough room', () => {
  const at = { ...input, width: 1856 };
  const open = frameLayout({ ...at, inspectorState: 'open' });
  const closed = frameLayout({ ...at, inspectorState: 'closed' });

  expect(open.list.width).toBe(312);
  expect(open.workbench.state).toBe(autoHidden);
  expect(closed.list.width).toBe(312);
  expect(closed.workbench.state).toBe('gutter');
});

it('opens an undragged Inspector into the room the list leaves, without folding the list', () => {
  const open = {
    ...input,
    inspectorState: 'open' as const,
    inspectorUndragged: true,
  };

  const layout = frameLayout({ ...open, preferredInspectorWidth: 600 });

  expect(layout.list.folded).toBe(false);
  expect(layout.page.width).toBe(688);
  expect(layout.inspector.width).toBe(352);

  const wide = frameLayout({
    ...open,
    width: 1800,
    preferredInspectorWidth: 600,
  });

  expect(wide.inspector.width).toBe(600);
});

it.each([
  { width: 1728, listWidth: 460 },
  { width: 1440, listWidth: 312 },
  { width: 1439, listWidth: 0 },
])(
  'fits the sidebar, saved Inspector and Feed together at $width when there is room',
  ({ width, listWidth }) => {
    const at = {
      ...input,
      width,
      preferredListWidth: 460,
      preferredInspectorWidth: 760,
    };

    const closed = frameLayout(at);
    const opened = frameLayout({ ...at, inspectorState: 'open' });

    expect(closed.list.folded).toBe(false);
    expect(opened.thresholds.listFold).toBe(1440);
    expect(opened.list.folded).toBe(width < 1440);
    expect(opened.inspector.open).toBe(true);
    expect(opened.page.width).toBeGreaterThanOrEqual(688);

    expect(opened.list.width).toBe(listWidth);
    expect(opened.inspector.width).toBeGreaterThanOrEqual(352);
  },
);
