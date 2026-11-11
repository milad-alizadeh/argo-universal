import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

const autoHidden = 'auto-hidden';

describe('independent Workbench cards beside the content', () => {
  it.each([
    {
      width: 1544,
      sidebarShown: true,
      inspectorState: 'closed',
      state: 'gutter',
    },
    {
      width: 1543,
      sidebarShown: true,
      inspectorState: 'closed',
      state: autoHidden,
    },
    {
      width: 1912,
      sidebarShown: true,
      inspectorState: 'open',
      state: 'gutter',
    },
    {
      width: 1911,
      sidebarShown: true,
      inspectorState: 'open',
      state: autoHidden,
    },
    {
      width: 1232,
      sidebarShown: false,
      inspectorState: 'closed',
      state: 'gutter',
    },
    {
      width: 1231,
      sidebarShown: false,
      inspectorState: 'closed',
      state: autoHidden,
    },
    {
      width: 1600,
      sidebarShown: false,
      inspectorState: 'open',
      state: 'gutter',
    },
    {
      width: 1599,
      sidebarShown: false,
      inspectorState: 'open',
      state: autoHidden,
    },
  ] as const)(
    'uses $state at $width with navigation $sidebarShown and Inspector $inspectorState',
    ({ state, ...placement }) => {
      const layout = frameLayout({ ...input, ...placement });

      expect(layout.workbench.state).toBe(state);
      expect(layout.workbench.offset).toBeGreaterThanOrEqual(
        layout.content.offset +
          layout.content.width -
          input.measures.contentGutter +
          input.measures.paneGap,
      );
    },
  );

  it.each([
    { width: 1544, offset: 384, contentShift: 156 },
    { width: 1700, offset: 540, contentShift: 78 },
    { width: 1856, offset: 696, contentShift: 0 },
  ])(
    'moves the content $contentShift aside at $width, where the trailing gutter alone does not hold the cards',
    ({ width, offset, contentShift }) => {
      const layout = frameLayout({ ...input, width });

      expect(layout.content).toEqual({ offset, width: 848 });
      expect(layout.contentShift).toBe(contentShift);
    },
  );

  it.each(['hidden', 'auto'] as const)(
    'centres the content while the Workbench is not in the gutter, with the intent %s',
    (workbenchIntent) => {
      const width = workbenchIntent === 'hidden' ? 1544 : 1543;
      const layout = frameLayout({ ...input, width, workbenchIntent });

      expect(layout.contentShift).toBe(0);
      expect(layout.content.offset).toBe(384 + (width - 384 - 848) / 2);
    },
  );

  it('leaves the content centred under an overlaid Workbench', () => {
    const layout = frameLayout({ ...input, workbenchIntent: 'shown' });

    expect(layout.workbench.state).toBe('overlay');
    expect(layout.contentShift).toBe(0);
    expect(layout.content).toEqual({ offset: 488, width: 848 });
  });

  it('keeps the conversation axis when both wide gutters fit the cards', () => {
    const shown = frameLayout({ ...input, width: 2560 });

    const hidden = frameLayout({
      ...input,
      width: 2560,
      workbenchIntent: 'hidden',
    });

    expect(shown.content).toEqual(hidden.content);
    expect(shown.workbench.offset).toBeGreaterThan(
      shown.content.offset + shown.content.width,
    );
  });
});
