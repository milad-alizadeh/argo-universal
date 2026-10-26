import { describe, expect, it } from 'vitest';
import {
  frameLayout,
  type FrameLayoutInput,
  resizeOutcome,
} from './frame-layout';
import { input } from './frame-layout.mocks';

describe('resize handles', () => {
  it('keeps each expanded pane divider reachable in its own gutter', () => {
    const { handles } = frameLayout({
      ...input,
      width: 1920,
      inspectorState: 'expanded',
    });

    expect(handles.list?.left).toBe(376);
    expect(handles.inspector.left).toBe(392);
  });

  it('drops the list handle when the list has no room to grow', () => {
    expect(frameLayout({ ...input, width: 1100 }).handles.list).toBeNull();
  });

  it('caps the list handle at the widest list', () => {
    const handle = frameLayout({ ...input, workbenchAvailable: false }).handles
      .list;

    expect(handle).toMatchObject({ minimum: 312, maximum: 460 });
  });
});

describe('the Inspector handle agrees with the layout', () => {
  const cases = [
    { width: 1440, sidebarShown: true },
    { width: 1920, sidebarShown: true },
    { width: 1180, sidebarShown: false },
  ];

  const openAt = ({
    width,
    sidebarShown,
  }: (typeof cases)[number]): FrameLayoutInput => ({
    ...input,
    width,
    sidebarShown,
    inspectorState: 'open',
  });

  it.each(cases)(
    'a drag past its limit at $width stops at the handle maximum',
    (state) => {
      const { handles } = frameLayout(openAt(state));

      expect(
        resizeOutcome(handles.inspector, handles.inspector.maximum + 100),
      ).toBe(handles.inspector.maximum);
    },
  );

  it.each(cases)(
    'the layout draws the Inspector at its handle maximum at $width',
    (state) => {
      const { handles } = frameLayout(openAt(state));

      const resized = frameLayout({
        ...openAt(state),
        preferredInspectorWidth: handles.inspector.maximum,
      });

      expect(resized.inspector.width).toBe(handles.inspector.maximum);
      expect(resized.page.width).toBeGreaterThanOrEqual(688);
    },
  );

  it.each([
    { width: 100, outcome: 'closed' },
    { width: 176, outcome: 352 },
    { width: 900, outcome: 664 },
    { width: 1024, outcome: 664 },
    { width: 1025, outcome: 'expanded' },
  ])('a drag to $width at 1440 gives $outcome', ({ width, outcome }) => {
    const { handles } = frameLayout({ ...input, inspectorState: 'open' });

    expect(resizeOutcome(handles.inspector, width)).toBe(outcome);
  });

  it('reaches across the whole page area', () => {
    const { handles } = frameLayout({ ...input, inspectorState: 'open' });

    expect(handles.inspector.reach).toBe(1368);
  });
});
