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
