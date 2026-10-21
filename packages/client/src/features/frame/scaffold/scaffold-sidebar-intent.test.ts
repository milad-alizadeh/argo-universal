import { expect, it } from 'vitest';
import { scaffoldGeometry } from './scaffold-geometry';
import { input } from './scaffold-geometry.mocks';

it.each([
  { width: 1180, inspectorState: 'closed' as const },
  { width: 1440, inspectorState: 'open' as const },
])(
  'an explicit sidebar request yields the Workbench at $width with Stage $inspectorState',
  (state) => {
    const { frame } = scaffoldGeometry({
      ...input,
      ...state,
      framed: true,
      sidebarRequested: true,
    });

    expect(frame.list.width).toBe(312);
    expect(frame.workbenchState).toBe('auto-hidden');
    expect(frame.page.width).toBeGreaterThanOrEqual(688);
  },
);

it('clamps a wider sidebar preference while preserving room to show its minimum', () => {
  const { frame } = scaffoldGeometry({
    ...input,
    width: 1100,
    framed: true,
    sidebarRequested: true,
    preferredListWidth: 460,
  });

  expect(frame.sidebarAvailable).toBe(true);
  expect(frame.list.width).toBe(340);
  expect(frame.page.width).toBe(688);
});

it('budgets the docked Workbench when resizing the sidebar to End', () => {
  const initial = scaffoldGeometry({ ...input, framed: true });

  const resized = scaffoldGeometry({
    ...input,
    framed: true,
    preferredListWidth: initial.listLimit,
  });

  expect(initial.listLimit).toBe(352);
  expect(resized.frame.listFolded).toBe(false);
  expect(resized.frame.workbenchState).toBe('docked');
  expect(resized.frame.page.width).toBe(688);
});
