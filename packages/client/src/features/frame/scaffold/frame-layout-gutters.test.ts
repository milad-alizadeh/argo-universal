import { describe, expect, it } from 'vitest';
import type { PaneSpan } from '../utils/pane-shift';
import { frameLayout } from './frame-layout';
import type { FrameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

const autoHidden = 'auto-hidden';

// Where the capped column sits when nothing moves it: centred in the page.
const centred = (layout: FrameLayout): PaneSpan => ({
  offset: layout.page.offset + (layout.page.width - 848) / 2,
  width: 848,
});

describe('Workbench cards in the trailing gutter', () => {
  it.each([
    {
      width: 1856,
      sidebarShown: true,
      inspectorState: 'closed',
      state: 'gutter',
    },
    {
      width: 1855,
      sidebarShown: true,
      inspectorState: 'closed',
      state: autoHidden,
    },
    {
      width: 2224,
      sidebarShown: true,
      inspectorState: 'open',
      state: 'gutter',
    },
    {
      width: 2223,
      sidebarShown: true,
      inspectorState: 'open',
      state: autoHidden,
    },
    {
      width: 1544,
      sidebarShown: false,
      inspectorState: 'closed',
      state: 'gutter',
    },
    {
      width: 1543,
      sidebarShown: false,
      inspectorState: 'closed',
      state: autoHidden,
    },
    {
      width: 1912,
      sidebarShown: false,
      inspectorState: 'open',
      state: 'gutter',
    },
    {
      width: 1911,
      sidebarShown: false,
      inspectorState: 'open',
      state: autoHidden,
    },
  ] as const)(
    'uses $state at $width with navigation $sidebarShown and Inspector $inspectorState',
    ({ state, ...placement }) => {
      const layout = frameLayout({ ...input, ...placement });

      expect(layout.workbench.state).toBe(state);
      expect(layout.content).toEqual(centred(layout));
    },
  );

  it.each([1856, 2000, 2560])(
    'keeps the 16 gap from the centred column at %i',
    (width) => {
      const { content, workbench } = frameLayout({ ...input, width });
      const columnEnd = content.offset + content.width - 24;
      const gap = workbench.offset - columnEnd;

      expect(workbench.state).toBe('gutter');
      expect(gap).toBeGreaterThanOrEqual(16);
    },
  );
});

describe('one centred content column', () => {
  it.each([
    { width: 1440, workbenchIntent: 'auto' },
    { width: 1544, workbenchIntent: 'auto' },
    { width: 1700, workbenchIntent: 'auto' },
    { width: 1856, workbenchIntent: 'auto' },
    { width: 1544, workbenchIntent: 'shown' },
    { width: 1544, workbenchIntent: 'hidden' },
    { width: 1000, workbenchIntent: 'shown' },
  ] as const)(
    'centres the content at $width with the intent $workbenchIntent',
    ({ width, workbenchIntent }) => {
      const layout = frameLayout({ ...input, width, workbenchIntent });

      expect(layout.content).toEqual(
        frameLayout({ ...input, width, workbenchAvailable: false }).content,
      );
      expect(layout.content.offset * 2 + layout.content.width).toBe(
        layout.page.offset * 2 + layout.page.width,
      );
    },
  );

  it('leaves the content where it is under an overlaid Workbench', () => {
    const layout = frameLayout({ ...input, workbenchIntent: 'shown' });

    expect(layout.workbench.state).toBe('overlay');
    expect(layout.content).toEqual({ offset: 488, width: 848 });
    expect(layout).not.toHaveProperty('contentShift');
  });

  it('is unchanged by a page with no Workbench cards', () => {
    for (const width of [1440, 1544, 1856, 2224]) {
      const layout = frameLayout({
        ...input,
        width,
        workbenchAvailable: false,
      });

      expect(layout.workbench).toMatchObject({ state: 'hidden', width: 0 });
      expect(layout.content).toEqual(centred(layout));
    }
  });
});

describe('the Workbench placed against the Inspector', () => {
  it('waits at the page trailing edge, not over the Inspector, while it is not drawn', () => {
    const layout = frameLayout({ ...input, inspectorState: 'open' });

    expect(layout.workbench.state).toBe(autoHidden);
    expect(layout.workbench.offset).toBe(
      layout.page.offset + layout.page.width - input.measures.inset,
    );
    expect(layout.workbench.offset).toBeLessThan(layout.inspector.offset);
  });

  it('never reaches under the Inspector when a drag left the page narrower than a card', () => {
    const layout = frameLayout({
      ...input,
      width: 1440,
      inspectorState: 'open',
      preferredInspectorWidth: 800,
      draggedContentFloor: 240,
      workbenchIntent: 'shown',
    });

    expect(layout.workbench.state).toBe('overlay');
    expect(layout.workbench.offset).toBe(layout.page.offset);
    expect(
      layout.workbench.offset + layout.workbench.width,
    ).toBeLessThanOrEqual(layout.inspector.offset - input.measures.paneGap);
  });
});
