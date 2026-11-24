import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

describe('frameLayout title bar', () => {
  it.each([
    { titleBarTop: 6, titleBarHeight: 46, panesTop: 52 },
    { titleBarTop: 0, titleBarHeight: 46, panesTop: 46 },
  ])(
    'starts the panes under a title bar of $titleBarHeight that starts $titleBarTop down',
    ({ titleBarTop, titleBarHeight, panesTop }) => {
      const layout = frameLayout({
        ...input,
        measures: { ...input.measures, titleBarTop, titleBarHeight },
      });

      expect(layout.panesTop).toBe(panesTop);
    },
  );
});

describe('frameLayout closed sidebar', () => {
  const closed = frameLayout({ ...input, sidebarShown: false });

  it('hides the rail with the list, so the page starts at the window edge', () => {
    expect(closed.rail.width).toBe(0);
    expect(closed.sidebarWidth).toBe(0);
    expect(closed.page.offset).toBe(0);
  });

  it("keeps the sidebar's divider at the window's edge to drag it open again", () => {
    expect(closed.handles.list).toMatchObject({ left: 0, value: 0 });
  });

  it('keeps the rail for a page with no list, the way to another section', () => {
    const listless = frameLayout({
      ...input,
      sidebarShown: false,
      listless: true,
    });

    expect(listless.rail.width).toBe(56);
    expect(listless.sidebarWidth).toBe(72);
    expect(listless.page.offset).toBe(72);
  });

  it('keeps an expanded Inspector one inset in from the window edge', () => {
    const layout = frameLayout({
      ...input,
      sidebarShown: false,
      inspectorState: 'expanded',
    });

    expect(layout.inspector).toMatchObject({ offset: 8, width: 1424 });
  });
});

const keyAt = (width: number): string =>
  frameLayout({ ...input, width, inspectorState: 'open' }).transitionKey;

describe('frameLayout regions', () => {
  it.each([
    { width: 1231, content: { offset: 384, width: 847 } },
    { width: 1232, content: { offset: 384, width: 848 } },
    { width: 1233, content: { offset: 384.5, width: 848 } },
  ])('centres the capped column at $width', ({ width, content }) => {
    expect(frameLayout({ ...input, width }).content).toEqual(content);
  });

  it('places the Inspector beside the column at 1440 while the sidebar keeps its space', () => {
    const layout = frameLayout({ ...input, inspectorState: 'open' });

    expect(layout.rail).toEqual({ offset: 8, width: 56 });
    expect(layout.list).toMatchObject({ offset: 64, width: 312 });
    expect(layout.content).toEqual({ offset: 384, width: 688 });
    expect(layout.inspector).toMatchObject({ offset: 1080, width: 352 });
    expect(layout.sidebarWidth).toBe(384);
  });

  it('gives an explicitly expanded Inspector the page area', () => {
    const layout = frameLayout({ ...input, inspectorState: 'expanded' });

    expect(layout.workbench.state).toBe('hidden');
    expect(layout.page).toMatchObject({ width: 0, hidden: true });
    expect(layout.inspector).toEqual({
      offset: 384,
      width: 1048,
      open: true,
      expanded: true,
    });
  });

  it('honours a manually folded list even above the fold threshold', () => {
    const layout = frameLayout({
      ...input,
      width: 1768,
      sidebarShown: false,
      inspectorState: 'open',
    });

    expect(layout.list).toMatchObject({ width: 0, folded: true });
    expect(layout.workbench.state).toBe('gutter');
    // Without the rail beside it the column starts nearer the window's edge than the rail's 152.
    expect(layout.content.width).toBe(848);
    expect(layout.content.offset).toBeLessThan(152);
  });
});

describe('frameLayout transition identity', () => {
  const autoHiddenKey = keyAt(1971);

  it('changes when the Workbench fits in the gutter', () => {
    expect(keyAt(1972)).not.toBe(autoHiddenKey);
  });

  it('holds while a resize leaves every pane as it was', () => {
    expect(keyAt(1970)).toBe(autoHiddenKey);
  });
});
