import { describe, expect, it } from 'vitest';
import {
  frameLayout,
  type FrameLayoutInput,
  resizeOutcome,
  widthBeside,
} from './frame-layout';
import { floorLeftBy, widthAtContentFloor } from './frame-layout-handles';
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
    expect(frameLayout({ ...input, width: 1072 }).handles.list).toBeNull();
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
    'a drag past its limit at $width expands the Inspector',
    (state) => {
      const { inspector } = frameLayout(openAt(state)).handles;

      expect(resizeOutcome(inspector, inspector.maximum)).toBe(
        inspector.maximum,
      );
      expect(resizeOutcome(inspector, inspector.maximum + 1)).toBe('expanded');
    },
  );

  it.each(cases)(
    'the layout draws the Inspector at its handle maximum at $width',
    (state) => {
      const { handles } = frameLayout(openAt(state));

      const { maximum } = handles.inspector;

      const resized = frameLayout({
        ...openAt(state),
        preferredInspectorWidth: maximum,
        draggedContentFloor: widthBeside(handles.inspector, maximum),
      });

      expect(resized.inspector.width).toBe(maximum);
      expect(resized.page.width).toBe(200);
      expect(resized.list.folded).toBe(!state.sidebarShown);
    },
  );

  it.each([
    { width: 100, outcome: 'closed' },
    { width: 176, outcome: 352 },
    { width: 500, outcome: 500 },
    { width: 840, outcome: 840 },
    { width: 841, outcome: 'expanded' },
  ])('a drag to $width at 1440 gives $outcome', ({ width, outcome }) => {
    const { handles } = frameLayout({ ...input, inspectorState: 'open' });

    expect(resizeOutcome(handles.inspector, width)).toBe(outcome);
  });

  it('keeps the content at its floor until a drag lowers it', () => {
    const untouched = frameLayout({
      ...input,
      inspectorState: 'open',
      preferredInspectorWidth: 600,
    });

    expect(untouched.list.folded).toBe(true);
    expect(untouched.page.width).toBeGreaterThanOrEqual(688);
  });

  it('folds the list before the content a drag narrowed gives more', () => {
    const dragged = {
      ...input,
      inspectorState: 'open' as const,
      preferredInspectorWidth: 600,
      draggedContentFloor: 440,
    };

    expect(frameLayout(dragged).page.width).toBe(440);
    expect(frameLayout({ ...dragged, width: 1439 }).list.folded).toBe(true);
  });

  it('keeps the list when a drag past the minimum expands the Inspector', () => {
    const open = frameLayout({ ...input, inspectorState: 'open' });
    const { maximum } = open.handles.inspector;

    const expanded = frameLayout({
      ...input,
      inspectorState: 'expanded',
      preferredInspectorWidth: maximum,
      draggedContentFloor: widthBeside(open.handles.inspector, maximum),
    });

    expect(expanded.list.folded).toBe(false);
    expect(resizeOutcome(expanded.handles.inspector, maximum + 1)).toBe(
      'expanded',
    );
  });

  it('lowers no floor for an Inspector left at its default width', () => {
    const narrow = { ...input, width: 1100, inspectorState: 'open' as const };
    const { inspector } = frameLayout(narrow).handles;

    expect(frameLayout(narrow).page.width).toBeLessThan(688);
    expect(floorLeftBy(inspector, inspector.minimum)).toBeUndefined();
  });

  it('gives up what a drag took under the floor when the Inspector closes', () => {
    expect(widthAtContentFloor(input.measures, 840, 200)).toBe(352);
    expect(widthAtContentFloor(input.measures, 900, 500)).toBe(712);
    expect(widthAtContentFloor(input.measures, 600, 800)).toBe(600);
  });

  it('gives the content its floor back once the Inspector closes', () => {
    const closed = frameLayout({ ...input, draggedContentFloor: 200 });

    expect(closed.thresholds.listFold).toBe(1072);
  });

  it('reaches across the whole page area', () => {
    const { handles } = frameLayout({ ...input, inspectorState: 'open' });

    expect(handles.inspector.reach).toBe(1056);
  });
});
