import { describe, expect, it } from 'vitest';
import { joined, left, type OrbHolder } from './orb-holders';

const header: OrbHolder = { id: 'header', state: 'searching', size: 'sm' };

const group: OrbHolder = { id: 'group', state: 'composing', size: 'sm' };

describe('the orbs that share one drawing', () => {
  it('draw the state of the orb that asked last', () => {
    expect(joined(joined([], header), group).at(-1)).toEqual(group);
  });

  it('draw the new state of an orb that changes it', () => {
    const solving: OrbHolder = { ...header, state: 'solving' };
    const holders = joined(joined(joined([], header), group), solving);

    expect(holders).toEqual([group, solving]);
  });

  it('fall back to an orb still shown when the newest leaves', () => {
    const holders = left(joined(joined([], header), group), group.id);

    expect(holders).toEqual([header]);
  });

  it('keep one holder when an orb leaves as its successor joins, so the drawing never stops', () => {
    const holders = joined(left(joined([], header), header.id), group);

    expect(holders).toEqual([group]);
  });

  it('are left unchanged by an orb asking again for what it shows', () => {
    const holders = joined([], header);

    expect(joined(holders, { ...header })).toBe(holders);
  });
});
