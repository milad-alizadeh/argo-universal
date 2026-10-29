import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

describe('independent Workbench cards in the side gutter', () => {
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
      state: 'docked',
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
      state: 'docked',
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
      state: 'docked',
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
      state: 'docked',
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
