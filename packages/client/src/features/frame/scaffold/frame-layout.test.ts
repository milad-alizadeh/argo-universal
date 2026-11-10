import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

describe('frameLayout band', () => {
  it.each([44, 52])(
    'reserves the measured band of %i before every pane',
    (bandHeight) => {
      const layout = frameLayout({
        ...input,
        measures: { ...input.measures, bandHeight },
      });

      expect(layout.panesTop).toBe(bandHeight);
    },
  );

  it.each([
    { width: 1440, sidebarShown: true, bandLeading: 124, leading: 388 },
    { width: 1440, sidebarShown: false, bandLeading: 124, leading: 232 },
    { width: 1100, sidebarShown: false, bandLeading: 44, leading: 142 },
    { width: 1100, sidebarShown: false, bandLeading: 200, leading: 24 },
  ])(
    'starts the title on the content column at $width with sidebar $sidebarShown',
    ({ width, sidebarShown, bandLeading, leading }) => {
      const layout = frameLayout({
        ...input,
        width,
        sidebarShown,
        measures: { ...input.measures, bandLeading },
      });

      expect(layout.bandTitleLeading).toBe(leading);
    },
  );
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

    expect(layout.list).toMatchObject({ offset: 64, width: 0, folded: true });
    expect(layout.workbench.state).toBe('auto-hidden');
    expect(layout.content).toEqual({ offset: 312, width: 848 });
  });
});

describe('frameLayout transition identity', () => {
  const autoHiddenKey = keyAt(2223);

  it('changes when the Workbench fits in the gutter', () => {
    expect(keyAt(2224)).not.toBe(autoHiddenKey);
  });

  it('holds while a resize leaves every pane as it was', () => {
    expect(keyAt(2222)).toBe(autoHiddenKey);
  });
});
