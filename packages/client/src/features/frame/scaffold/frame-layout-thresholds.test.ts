import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

describe('frameLayout thresholds', () => {
  it.each([
    {
      inspectorState: 'closed' as const,
      listFold: 1072,
      workbenchGutter: 1544,
    },
    { inspectorState: 'open' as const, listFold: 1440, workbenchGutter: 1912 },
  ])(
    'derives the thresholds with the Inspector $inspectorState',
    ({ inspectorState, listFold, workbenchGutter }) => {
      expect(frameLayout({ ...input, inspectorState }).thresholds).toEqual({
        listFold,
        workbenchGutter,
      });
    },
  );

  it('needs no room for the list in the gutter threshold while it is hidden', () => {
    expect(
      frameLayout({ ...input, sidebarShown: false }).thresholds.workbenchGutter,
    ).toBe(1232);
  });

  it.each([
    { measure: 'listWidth', value: 340, listFold: 1100, workbenchGutter: 1572 },
    { measure: 'railWidth', value: 80, listFold: 1096, workbenchGutter: 1568 },
    {
      measure: 'workbenchWidth',
      value: 336,
      listFold: 1072,
      workbenchGutter: 1568,
    },
    {
      measure: 'composerWidth',
      value: 600,
      listFold: 1032,
      workbenchGutter: 1544,
    },
    {
      measure: 'contentMaximum',
      value: 1000,
      listFold: 1072,
      workbenchGutter: 1744,
    },
  ])(
    'responds to the declared $measure',
    ({ measure, value, listFold, workbenchGutter }) => {
      expect(
        frameLayout({
          ...input,
          measures: { ...input.measures, [measure]: value },
        }).thresholds,
      ).toEqual({ listFold, workbenchGutter });
    },
  );
});

describe('frameLayout gives up width in order', () => {
  it.each([
    {
      width: 1544,
      inspectorState: 'closed',
      folded: false,
      gutter: true,
      content: 848,
    },
    {
      width: 1543,
      inspectorState: 'closed',
      folded: false,
      gutter: false,
      content: 848,
    },
    {
      width: 1912,
      inspectorState: 'open',
      folded: false,
      gutter: true,
      content: 848,
    },
    {
      width: 1911,
      inspectorState: 'open',
      folded: false,
      gutter: false,
      content: 848,
    },
    {
      width: 1456,
      inspectorState: 'open',
      folded: false,
      gutter: false,
      content: 704,
    },
    {
      width: 1455,
      inspectorState: 'open',
      folded: false,
      gutter: false,
      content: 703,
    },
    {
      width: 1440,
      inspectorState: 'open',
      folded: false,
      gutter: false,
      content: 688,
    },
    {
      width: 1072,
      inspectorState: 'closed',
      folded: false,
      gutter: false,
      content: 688,
    },
    {
      width: 1071,
      inspectorState: 'closed',
      folded: true,
      gutter: false,
      content: 848,
    },
    {
      width: 1439,
      inspectorState: 'open',
      folded: true,
      gutter: false,
      content: 848,
    },
    {
      width: 759,
      inspectorState: 'closed',
      folded: true,
      gutter: false,
      content: 687,
    },
  ] as const)(
    'protects the column at $width with the Inspector $inspectorState',
    ({ width, inspectorState, folded, gutter, content }) => {
      const layout = frameLayout({ ...input, width, inspectorState });

      expect(layout.list.folded).toBe(folded);
      expect(layout.workbench.state === 'gutter').toBe(gutter);
      expect(layout.content.width).toBe(content);
      expect(layout.list.width).toBe(folded ? 0 : 312);
      expect(layout.workbench.width).toBe(gutter ? 312 : 0);
    },
  );
});
