import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

const autoHidden = 'auto-hidden';

describe('independent Workbench cards beside the content', () => {
  it.each([
    {
      width: 1604,
      sidebarShown: true,
      inspectorState: 'closed',
      state: 'gutter',
    },
    {
      width: 1603,
      sidebarShown: true,
      inspectorState: 'closed',
      state: autoHidden,
    },
    {
      width: 1972,
      sidebarShown: true,
      inspectorState: 'open',
      state: 'gutter',
    },
    {
      width: 1971,
      sidebarShown: true,
      inspectorState: 'open',
      state: autoHidden,
    },
    {
      width: 1220,
      sidebarShown: false,
      inspectorState: 'closed',
      state: 'gutter',
    },
    {
      width: 1219,
      sidebarShown: false,
      inspectorState: 'closed',
      state: autoHidden,
    },
    {
      width: 1588,
      sidebarShown: false,
      inspectorState: 'open',
      state: 'gutter',
    },
    {
      width: 1587,
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
    { width: 1604, content: { offset: 410, width: 848 }, contentShift: 160 },
    { width: 1700, content: { offset: 458, width: 848 }, contentShift: 160 },
    { width: 2055, content: { offset: 635.5, width: 848 }, contentShift: 160 },
    { width: 2056, content: { offset: 796, width: 848 }, contentShift: 0 },
  ])(
    "moves the content half the card and the inset aside at $width, or centres it in the page once each side of it keeps 400 and the cards' extra width",
    ({ width, content, contentShift }) => {
      const layout = frameLayout({ ...input, width });

      expect(layout.content).toEqual(content);
      expect(layout.contentShift).toBe(contentShift);
    },
  );

  it.each(['hidden', 'auto'] as const)(
    'centres the content while the Workbench is not in the gutter, with the intent %s',
    (workbenchIntent) => {
      const width = workbenchIntent === 'hidden' ? 1604 : 1603;
      const layout = frameLayout({ ...input, width, workbenchIntent });

      expect(layout.contentShift).toBe(0);
      expect(layout.content.offset).toBe(384 + (width - 384 - 848) / 2);
    },
  );

  it.each([1500, 1000])(
    'keeps the content centred under an overlaid Workbench at %i',
    (width) => {
      const layout = frameLayout({ ...input, width, workbenchPopover: true });

      const hidden = frameLayout({
        ...input,
        width,
        workbenchIntent: 'hidden',
      });

      expect(layout.workbench.state).toBe('overlay');
      expect(layout.contentShift).toBe(0);
      expect(layout.content).toEqual(hidden.content);
    },
  );

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
