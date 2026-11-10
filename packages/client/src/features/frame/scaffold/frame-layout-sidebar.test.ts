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

  expect(layout.list.available).toBe(true);
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

it('keeps the list unavailable while the content and the Inspector need its room', () => {
  const layout = frameLayout({
    ...input,
    width: 1300,
    inspectorState: 'open',
  });

  expect(layout.list.available).toBe(false);
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
