import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

describe('frameLayout thresholds', () => {
  it.each([
    {
      inspectorState: 'closed' as const,
      listFold: 1072,
      workbenchUndock: 1400,
    },
    { inspectorState: 'open' as const, listFold: 1440, workbenchUndock: 1768 },
  ])(
    'derives the thresholds with the Inspector $inspectorState',
    ({ inspectorState, listFold, workbenchUndock }) => {
      expect(frameLayout({ ...input, inspectorState }).thresholds).toEqual({
        listFold,
        workbenchUndock,
      });
    },
  );

  it.each([
    { measure: 'listWidth', value: 340, listFold: 1100, workbenchUndock: 1428 },
    { measure: 'railWidth', value: 80, listFold: 1096, workbenchUndock: 1424 },
    {
      measure: 'workbenchWidth',
      value: 336,
      listFold: 1072,
      workbenchUndock: 1424,
    },
    {
      measure: 'composerWidth',
      value: 600,
      listFold: 1032,
      workbenchUndock: 1360,
    },
    {
      measure: 'contentMaximum',
      value: 1000,
      listFold: 1072,
      workbenchUndock: 1400,
    },
  ])(
    'responds to the declared $measure',
    ({ measure, value, listFold, workbenchUndock }) => {
      expect(
        frameLayout({
          ...input,
          measures: { ...input.measures, [measure]: value },
        }).thresholds,
      ).toEqual({ listFold, workbenchUndock });
    },
  );
});

describe('frameLayout gives up width in order', () => {
  it.each([
    {
      width: 1400,
      inspectorState: 'closed',
      folded: false,
      docked: true,
      content: 688,
    },
    {
      width: 1399,
      inspectorState: 'closed',
      folded: false,
      docked: false,
      content: 848,
    },
    {
      width: 1768,
      inspectorState: 'open',
      folded: false,
      docked: true,
      content: 688,
    },
    {
      width: 1767,
      inspectorState: 'open',
      folded: false,
      docked: false,
      content: 848,
    },
    {
      width: 1456,
      inspectorState: 'open',
      folded: false,
      docked: false,
      content: 704,
    },
    {
      width: 1455,
      inspectorState: 'open',
      folded: false,
      docked: false,
      content: 703,
    },
    {
      width: 1440,
      inspectorState: 'open',
      folded: false,
      docked: false,
      content: 688,
    },
    {
      width: 1072,
      inspectorState: 'closed',
      folded: false,
      docked: false,
      content: 688,
    },
    {
      width: 1071,
      inspectorState: 'closed',
      folded: true,
      docked: false,
      content: 848,
    },
    {
      width: 1439,
      inspectorState: 'open',
      folded: true,
      docked: false,
      content: 848,
    },
    {
      width: 759,
      inspectorState: 'closed',
      folded: true,
      docked: false,
      content: 687,
    },
  ] as const)(
    'protects the column at $width with the Inspector $inspectorState',
    ({ width, inspectorState, folded, docked, content }) => {
      const layout = frameLayout({ ...input, width, inspectorState });

      expect(layout.list.folded).toBe(folded);
      expect(layout.workbench.state === 'docked').toBe(docked);
      expect(layout.content.width).toBe(content);
      expect(layout.list.width).toBe(folded ? 0 : 312);
      expect(layout.workbench.width).toBe(docked ? 312 : 0);
    },
  );
});
