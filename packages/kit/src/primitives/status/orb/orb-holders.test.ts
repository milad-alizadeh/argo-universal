import { describe, expect, it } from 'vitest';
import {
  displaced,
  type OrbHolder,
  withHolder,
  withoutHolder,
} from './orb-holders';

const header: OrbHolder = { id: 'header', state: 'searching', size: 'sm' };

const group: OrbHolder = { id: 'group', state: 'composing', size: 'sm' };

const both = withHolder(withHolder([], header), group);

describe('the orbs that share one drawing', () => {
  it('draw the state of the orb that appeared last', () => {
    expect(both.at(-1)).toEqual(group);
  });

  it('keep the place of an orb that changes its state, so two orbs on screen never trade the drawing', () => {
    const solving: OrbHolder = { ...header, state: 'solving' };

    expect(withHolder(both, solving)).toEqual([solving, group]);
  });

  it('draw the new state of the one orb on screen when it changes', () => {
    const solving: OrbHolder = { ...header, state: 'solving' };

    expect(withHolder(withHolder([], header), solving)).toEqual([solving]);
  });

  it('fall back to an orb still shown when the newest leaves', () => {
    expect(withoutHolder(both, group.id)).toEqual([header]);
  });

  it('keep one holder when an orb leaves as its successor joins, so the drawing never stops', () => {
    const holders = withHolder(
      withoutHolder(withHolder([], header), header.id),
      group,
    );

    expect(holders).toEqual([group]);
  });

  it('are left unchanged by an orb asking again for what it shows', () => {
    const holders = withHolder([], header);

    expect(withHolder(holders, { ...header })).toBe(holders);
  });

  it('leave every orb but the last to draw an orb of its own, so none is left empty', () => {
    expect(displaced(both)).toEqual([header.id]);
    expect(displaced(withHolder([], header))).toEqual([]);
    expect(displaced([])).toEqual([]);
  });
});
