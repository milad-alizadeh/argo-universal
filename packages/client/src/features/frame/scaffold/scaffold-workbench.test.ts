import { describe, expect, it } from 'vitest';
import { scaffoldGeometry } from './scaffold-geometry';
import { input } from './scaffold-geometry.mocks';

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
      scaffoldGeometry({ ...input, width, workbenchShown: shown }).frame
        .workbenchState,
    ).toBe(state);
  });

  it('floats over the same content bounds as the auto-hidden state', () => {
    const hidden = scaffoldGeometry({ ...input, width: 900 });

    const floating = scaffoldGeometry({
      ...input,
      width: 900,
      workbenchShown: true,
    });

    expect(floating.frame.content).toEqual(hidden.frame.content);

    expect(floating.frame.workbench.width).toBeGreaterThan(0);
  });

  it('auto-hides beside an open Stage at 1440', () => {
    const { frame } = scaffoldGeometry({ ...input, inspectorState: 'open' });

    expect(frame.workbenchState).toBe('auto-hidden');

    expect(frame.content.width).toBeGreaterThanOrEqual(688);
  });

  it('does not reserve a Workbench on pages without summaries', () => {
    const { frame } = scaffoldGeometry({
      ...input,
      width: 1440,
      workbenchAvailable: false,
    });

    expect(frame.workbenchState).toBe('hidden');

    expect(frame.workbench.width).toBe(0);

    expect(frame.list.width).toBe(312);
  });
});

describe('production framed pane geometry', () => {
  it.each([
    {
      width: 1456,
      inspectorState: 'open' as const,
      workbenchShown: undefined,
      shownListWidth: 0,
      detailWidth: 688,
      inspectorHandleLeft: 1096,
      inspectorTargetWidth: 352,
    },
    {
      width: 1455,
      inspectorState: 'open' as const,
      workbenchShown: undefined,
      shownListWidth: 0,
      detailWidth: 1015,
      inspectorHandleLeft: 1095,
      inspectorTargetWidth: 352,
    },
    {
      width: 1440,
      inspectorState: 'closed' as const,
      workbenchShown: false,
      shownListWidth: 312,
      detailWidth: 1056,
      inspectorHandleLeft: 1432,
      inspectorTargetWidth: 0,
    },
    {
      width: 1440,
      inspectorState: 'closed' as const,
      workbenchShown: true,
      shownListWidth: 312,
      detailWidth: 728,
      inspectorHandleLeft: 1432,
      inspectorTargetWidth: 0,
    },
    {
      width: 1440,
      inspectorState: 'expanded' as const,
      workbenchShown: undefined,
      shownListWidth: 0,
      detailWidth: 0,
      inspectorHandleLeft: 72,
      inspectorTargetWidth: 1360,
    },
  ])(
    'places panes at $width with Stage $inspectorState and toggle $workbenchShown',
    ({ width, inspectorState, workbenchShown, ...expected }) => {
      expect(
        scaffoldGeometry({
          ...input,
          width,
          inspectorState,
          workbenchShown,
          framed: true,
        }),
      ).toMatchObject(expected);
    },
  );

  it('changes the transition identity when the Workbench undocks', () => {
    const docked = scaffoldGeometry({
      ...input,
      width: 1456,
      inspectorState: 'open',
      framed: true,
    });

    const hidden = scaffoldGeometry({
      ...input,
      width: 1455,
      inspectorState: 'open',
      framed: true,
    });

    expect(docked.transitionKey).toBe('true:open:true:docked');
    expect(hidden.transitionKey).toBe('true:open:true:auto-hidden');
  });
});
