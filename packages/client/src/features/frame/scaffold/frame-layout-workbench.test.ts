import { describe, expect, it } from 'vitest';
import { frameLayout } from './frame-layout';
import { input } from './frame-layout.mocks';

const autoHidden = 'auto-hidden';

describe('Workbench states from one toggle', () => {
  it.each([
    { width: 1440, shown: undefined, state: 'docked' },
    { width: 900, shown: undefined, state: autoHidden },
    { width: 900, shown: true, state: 'floating' },
    { width: 900, shown: false, state: autoHidden },
    { width: 1440, shown: false, state: 'hidden' },
    { width: 1440, shown: true, state: 'docked' },
  ])('at $width with toggle $shown is $state', ({ width, shown, state }) => {
    expect(
      frameLayout({ ...input, width, workbenchShown: shown }).workbench.state,
    ).toBe(state);
  });

  it('floats over the same content bounds as the auto-hidden state', () => {
    const hidden = frameLayout({ ...input, width: 900 });

    const floating = frameLayout({
      ...input,
      width: 900,
      workbenchShown: true,
    });

    expect(floating.content).toEqual(hidden.content);
    expect(floating.workbench.width).toBeGreaterThan(0);
  });

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

  it('waits at the trailing inset while it is not drawn, and docks beside the Inspector', () => {
    expect(frameLayout({ ...input, workbenchShown: false }).workbench).toEqual({
      state: 'hidden',
      offset: 1432,
      width: 0,
    });
    expect(
      frameLayout({ ...input, width: 1920, inspectorState: 'open' }).workbench,
    ).toEqual({ state: 'docked', offset: 1232, width: 312 });
  });
});

describe('panes placed around the Workbench', () => {
  it.each([
    {
      width: 1456,
      inspectorState: 'open',
      workbenchShown: undefined,
      list: 0,
      page: 688,
      handle: 1096,
      inspector: 352,
    },
    {
      width: 1455,
      inspectorState: 'open',
      workbenchShown: undefined,
      list: 0,
      page: 1015,
      handle: 1095,
      inspector: 352,
    },
    {
      width: 1440,
      inspectorState: 'closed',
      workbenchShown: false,
      list: 312,
      page: 1056,
      handle: 1432,
      inspector: 0,
    },
    {
      width: 1440,
      inspectorState: 'closed',
      workbenchShown: true,
      list: 312,
      page: 728,
      handle: 1432,
      inspector: 0,
    },
    {
      width: 1440,
      inspectorState: 'expanded',
      workbenchShown: undefined,
      list: 0,
      page: 0,
      handle: 80,
      inspector: 1360,
    },
  ] as const)(
    'places panes at $width with the Inspector $inspectorState and toggle $workbenchShown',
    ({ width, inspectorState, workbenchShown, ...expected }) => {
      const layout = frameLayout({
        ...input,
        width,
        inspectorState,
        workbenchShown,
      });

      expect(layout.list.width).toBe(expected.list);
      expect(layout.page.width).toBe(expected.page);
      expect(layout.handles.inspector.left).toBe(expected.handle);
      expect(layout.inspector.width).toBe(expected.inspector);
    },
  );

  it('gives up the list and Workbench before letting a resized Inspector take the content floor', () => {
    const layout = frameLayout({
      ...input,
      width: 1920,
      inspectorState: 'open',
      preferredInspectorWidth: 1500,
    });

    expect(layout.page).toEqual({ offset: 72, width: 688, hidden: false });
    expect(layout.inspector).toMatchObject({ offset: 768, width: 1144 });
  });
});
