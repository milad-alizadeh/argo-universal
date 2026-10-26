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
    { width: 1440, sidebarShown: true, bandLeading: 124, leading: 284 },
    { width: 1440, sidebarShown: false, bandLeading: 124, leading: 68 },
    { width: 1100, sidebarShown: false, bandLeading: 44, leading: 52 },
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
    { width: 1559, content: { offset: 384, width: 847 } },
    { width: 1560, content: { offset: 384, width: 848 } },
    { width: 1561, content: { offset: 384.5, width: 848 } },
  ])('centres the capped column at $width', ({ width, content }) => {
    expect(frameLayout({ ...input, width }).content).toEqual(content);
  });

  it('places the Inspector beside the column at 1440 after the list and Workbench give way', () => {
    const layout = frameLayout({ ...input, inspectorState: 'open' });

    expect(layout.rail).toEqual({ offset: 8, width: 56 });
    expect(layout.list).toMatchObject({ offset: 64, width: 0 });
    expect(layout.content).toEqual({ offset: 148, width: 848 });
    expect(layout.inspector).toMatchObject({ offset: 1080, width: 352 });
    expect(layout.sidebarWidth).toBe(72);
  });

  it('gives an explicitly expanded Inspector the page area', () => {
    const layout = frameLayout({ ...input, inspectorState: 'expanded' });

    expect(layout.workbench.state).toBe('hidden');
    expect(layout.page).toMatchObject({ width: 0, hidden: true });
    expect(layout.inspector).toEqual({
      offset: 72,
      width: 1360,
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
    expect(layout.workbench.state).toBe('docked');
    expect(layout.content).toEqual({ offset: 148, width: 848 });
  });
});

describe('frameLayout transition identity', () => {
  const autoHiddenKey = keyAt(1455);

  it('changes when the Workbench docks', () => {
    expect(keyAt(1456)).not.toBe(autoHiddenKey);
  });

  it('holds while a resize leaves every pane as it was', () => {
    expect(keyAt(1454)).toBe(autoHiddenKey);
  });
});
