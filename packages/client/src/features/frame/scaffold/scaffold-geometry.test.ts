import { describe, expect, it } from 'vitest';
import { scaffoldGeometry } from './scaffold-geometry';
import { input } from './scaffold-geometry.mocks';

describe('scaffoldGeometry frame', () => {
  it('reserves the measured top band before every pane', () => {
    expect(scaffoldGeometry(input).frame.panesTop).toBe(44);
    expect(
      scaffoldGeometry({
        ...input,
        measures: { ...input.measures, topBandHeight: 52 },
      }).frame.panesTop,
    ).toBe(52);
  });
});

describe('scaffoldGeometry thresholds', () => {
  it.each([
    {
      inspectorState: 'closed' as const,
      listFold: 1400,
      workbenchUndock: 1088,
    },
    { inspectorState: 'open' as const, listFold: 1768, workbenchUndock: 1456 },
  ])(
    'derives the thresholds with the Stage $inspectorState',
    ({ inspectorState, listFold, workbenchUndock }) => {
      expect(
        scaffoldGeometry({ ...input, inspectorState }).frame.thresholds,
      ).toEqual({ listFold, workbenchUndock });
    },
  );
});

describe('scaffoldGeometry measured thresholds', () => {
  it.each([
    { measure: 'listWidth', value: 340, listFold: 1428, workbenchUndock: 1088 },
    { measure: 'railWidth', value: 80, listFold: 1424, workbenchUndock: 1112 },
    {
      measure: 'workbenchWidth',
      value: 336,
      listFold: 1424,
      workbenchUndock: 1112,
    },
    {
      measure: 'composerWidth',
      value: 600,
      listFold: 1360,
      workbenchUndock: 1048,
    },
    {
      measure: 'contentMaximum',
      value: 1000,
      listFold: 1400,
      workbenchUndock: 1088,
    },
  ])(
    'responds to the declared $measure',
    ({ measure, value, listFold, workbenchUndock }) => {
      expect(
        scaffoldGeometry({
          ...input,
          measures: { ...input.measures, [measure]: value },
        }).frame.thresholds,
      ).toEqual({ listFold, workbenchUndock });
    },
  );
});

describe('scaffoldGeometry pane transitions', () => {
  it.each([
    {
      width: 1400,
      inspectorState: 'closed' as const,
      listFolded: false,
      workbenchDocked: true,
      contentWidth: 688,
    },
    {
      width: 1399,
      inspectorState: 'closed' as const,
      listFolded: true,
      workbenchDocked: true,
      contentWidth: 848,
    },
    {
      width: 1088,
      inspectorState: 'closed' as const,
      listFolded: true,
      workbenchDocked: true,
      contentWidth: 688,
    },
    {
      width: 1087,
      inspectorState: 'closed' as const,
      listFolded: true,
      workbenchDocked: false,
      contentWidth: 848,
    },
    {
      width: 1768,
      inspectorState: 'open' as const,
      listFolded: false,
      workbenchDocked: true,
      contentWidth: 688,
    },
    {
      width: 1767,
      inspectorState: 'open' as const,
      listFolded: true,
      workbenchDocked: true,
      contentWidth: 848,
    },
    {
      width: 1456,
      inspectorState: 'open' as const,
      listFolded: true,
      workbenchDocked: true,
      contentWidth: 688,
    },
    {
      width: 1455,
      inspectorState: 'open' as const,
      listFolded: true,
      workbenchDocked: false,
      contentWidth: 848,
    },
    {
      width: 1440,
      inspectorState: 'open' as const,
      listFolded: true,
      workbenchDocked: false,
      contentWidth: 848,
    },
    {
      width: 759,
      inspectorState: 'closed' as const,
      listFolded: true,
      workbenchDocked: false,
      contentWidth: 687,
    },
  ])(
    'protects the column at $width with Stage $inspectorState',
    ({ width, inspectorState, listFolded, workbenchDocked, contentWidth }) => {
      const { frame } = scaffoldGeometry({ ...input, width, inspectorState });
      expect(frame.listFolded).toBe(listFolded);
      expect(frame.workbenchDocked).toBe(workbenchDocked);
      expect(frame.content.width).toBe(contentWidth);
      expect(frame.list.width).toBe(listFolded ? 0 : 312);
      expect(frame.workbench.width).toBe(workbenchDocked ? 312 : 0);
    },
  );
});
