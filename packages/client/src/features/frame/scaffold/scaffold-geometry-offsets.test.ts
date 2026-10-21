import { describe, expect, it } from 'vitest';
import { scaffoldGeometry } from './scaffold-geometry';
import { input } from './scaffold-geometry.mocks';

describe('scaffoldGeometry offsets and compatibility', () => {
  it.each([
    { width: 1559, content: { offset: 384, width: 847 } },
    { width: 1560, content: { offset: 384, width: 848 } },
    { width: 1561, content: { offset: 384.5, width: 848 } },
  ])('centres the capped column at $width', ({ width, content }) => {
    expect(scaffoldGeometry({ ...input, width }).frame.content).toEqual(
      content,
    );
  });

  it('places the Stage beside the column at 1440 after the list and Workbench give way', () => {
    const { frame } = scaffoldGeometry({ ...input, inspectorState: 'open' });
    expect(frame.rail).toEqual({ offset: 8, width: 56 });
    expect(frame.list).toEqual({ offset: 64, width: 0 });
    expect(frame.content).toEqual({ offset: 148, width: 848 });
    expect(frame.stage).toEqual({ offset: 1080, width: 352 });
  });

  it('gives an explicitly expanded Stage the page area', () => {
    const { frame } = scaffoldGeometry({
      ...input,
      inspectorState: 'expanded',
    });

    expect(frame.workbenchDocked).toBe(false);
    expect(frame.content.width).toBe(0);
    expect(frame.stage).toEqual({ offset: 72, width: 1360 });
  });

  it('honours a manually folded list even above the fold threshold', () => {
    const { frame } = scaffoldGeometry({
      ...input,
      width: 1768,
      sidebarShown: false,
      inspectorState: 'open',
    });

    expect(frame.list).toEqual({ offset: 64, width: 0 });
    expect(frame.workbenchDocked).toBe(true);
    expect(frame.content).toEqual({ offset: 148, width: 848 });
  });

  it('preserves every legacy output while the top band is added', () => {
    const { frame, ...legacy } = scaffoldGeometry({
      ...input,
      inspectorState: 'open',
    });

    expect(frame.panesTop).toBe(44);
    expect(legacy).toEqual({
      usableWidth: 1368,
      listLimit: 1008,
      visibleListWidth: 312,
      shownListWidth: 312,
      availableWidth: 1056,
      inspectorOpen: true,
      inspectorExpanded: false,
      inspectorTargetWidth: 352,
      detailWidth: 704,
      listHandleLeft: 376,
      inspectorHandleLeft: 1088,
      detailRight: 1016,
      transitionKey: 'true:open:false',
    });
  });
});
