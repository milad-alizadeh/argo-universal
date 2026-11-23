import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

const autoHidden = 'auto-hidden';

describe('Workbench states from one toggle', () => {
  it.each([
    { width: 1856, workbenchIntent: 'auto', state: 'gutter' },
    { width: 1440, workbenchIntent: 'auto', state: autoHidden },
    { width: 900, workbenchIntent: 'auto', state: autoHidden },
    { width: 900, workbenchIntent: 'shown', state: autoHidden },
    { width: 900, workbenchIntent: 'hidden', state: 'hidden' },
    { width: 1440, workbenchIntent: 'hidden', state: 'hidden' },
    { width: 1440, workbenchIntent: 'shown', state: autoHidden },
    { width: 1856, workbenchIntent: 'shown', state: 'gutter' },
    { width: 1856, workbenchIntent: 'hidden', state: 'hidden' },
  ] as const)(
    'at $width with the intent $workbenchIntent is $state',
    ({ state, ...placement }) => {
      expect(frameLayout({ ...input, ...placement }).workbench.state).toBe(
        state,
      );
    },
  );

  it('auto-hides beside an open Inspector at 1440', () => {
    const layout = frameLayout({ ...input, inspectorState: 'open' });

    expect(layout.workbench.state).toBe('auto-hidden');
    expect(layout.content.width).toBeGreaterThanOrEqual(688);
  });

  it('does not reserve a Workbench on pages without summaries', () => {
    const layout = frameLayout({ ...input, workbenchAvailable: false });

    expect(layout.workbench.state).toBe('hidden');
    expect(layout.workbench.width).toBe(0);
    expect(layout.list.width).toBe(312);
  });

  it('waits at the trailing inset while it is not drawn', () => {
    const { workbench } = frameLayout({ ...input, workbenchIntent: 'hidden' });

    expect(workbench).toEqual({
      state: 'hidden',
      offset: 1432,
      width: 0,
      fits: false,
    });
  });
});

describe('panes placed under the Workbench', () => {
  it.each([
    {
      width: 1456,
      inspectorState: 'open',
      workbenchIntent: 'auto',
      list: 312,
      page: 704,
      handle: 1096,
      inspector: 352,
    },
    {
      width: 1455,
      inspectorState: 'open',
      workbenchIntent: 'auto',
      list: 312,
      page: 703,
      handle: 1095,
      inspector: 352,
    },
    {
      width: 1440,
      inspectorState: 'closed',
      workbenchIntent: 'hidden',
      list: 312,
      page: 1056,
      handle: 1440,
      inspector: 0,
    },
    {
      width: 1440,
      inspectorState: 'closed',
      workbenchIntent: 'shown',
      list: 312,
      page: 1056,
      handle: 1440,
      inspector: 0,
    },
    {
      width: 1440,
      inspectorState: 'expanded',
      workbenchIntent: 'auto',
      list: 312,
      page: 0,
      handle: 392,
      inspector: 1048,
    },
  ] as const)(
    'places panes at $width with the Inspector $inspectorState and the Workbench intent $workbenchIntent',
    ({ width, inspectorState, workbenchIntent, ...expected }) => {
      const layout = frameLayout({
        ...input,
        width,
        inspectorState,
        workbenchIntent,
      });

      expect(layout.list.width).toBe(expected.list);
      expect(layout.page.width).toBe(expected.page);
      expect(layout.handles.inspector.left).toBe(expected.handle);
      expect(layout.inspector.width).toBe(expected.inspector);
    },
  );

  it('gives up the list before letting a resized Inspector take the content floor', () => {
    const layout = frameLayout({
      ...input,
      width: 1920,
      inspectorState: 'open',
      preferredInspectorWidth: 1500,
    });

    expect(layout.page).toEqual({ offset: 0, width: 688, hidden: false });
    expect(layout.inspector).toMatchObject({ offset: 696, width: 1216 });
  });
});
