import { describe, expect, it } from 'vitest';
import {
  type ColumnClaim,
  type ColumnClaims,
  claimState,
  type ContentColumn,
  counted,
  noClaims,
  partLayout,
  sideColumn,
  sideColumnExtra,
} from './column-layout';

const claimed = (...claims: ColumnClaim[]): ColumnClaims =>
  claims.reduce((count, claim) => counted(claim, 1)(count), noClaims);

const column: ContentColumn = { paddingLeft: 1, paddingRight: 1 };

const inherited: ContentColumn = { paddingLeft: 2, paddingRight: 2 };

describe('claimState', () => {
  it('leaves an unclaimed part to pad its content', () => {
    expect(claimState(noClaims)).toEqual({
      claimed: false,
      filled: false,
      grouped: false,
      side: false,
    });
  });

  it('reports a side column without claiming the column', () => {
    expect(claimState(claimed('side'))).toEqual({
      claimed: false,
      filled: false,
      grouped: false,
      side: true,
    });
  });

  it('fills the part only for a claim that fills', () => {
    expect(claimState(claimed('keep'))).toMatchObject({
      claimed: true,
      filled: false,
    });
    expect(claimState(claimed('fill'))).toMatchObject({
      claimed: true,
      filled: true,
    });
  });

  it('counts grouped cards as claiming and filling', () => {
    expect(claimState(claimed('grouped'))).toEqual({
      claimed: true,
      filled: true,
      grouped: true,
      side: false,
    });
  });

  it('keeps a claim until every claimer withdraws', () => {
    const twice = claimed('fill', 'fill');
    const once = counted('fill', -1)(twice);

    expect(claimState(once).filled).toBe(true);
    expect(claimState(counted('fill', -1)(once))).toMatchObject({
      claimed: false,
      filled: false,
    });
  });
});

describe('partLayout', () => {
  const wide = { wide: true, column, inherited };

  it('offers a wide column only to content that claims it', () => {
    expect(partLayout(claimState(claimed('fill')), wide).offered).toBe(column);
    expect(partLayout(claimState(noClaims), wide).offered).toBeUndefined();
  });

  it('passes on only what it was offered below wide', () => {
    const narrow = { ...wide, wide: false };

    expect(partLayout(claimState(claimed('fill')), narrow).offered).toBe(
      inherited,
    );
    expect(partLayout(claimState(noClaims), narrow).offered).toBe(inherited);
  });
});

describe('sideColumnExtra', () => {
  it('widens a capped column by the side column and its gap, only when one is drawn', () => {
    expect(sideColumnExtra(false)).toBe(0);
    expect(sideColumnExtra(true)).toBe(sideColumn.width + sideColumn.gap);
  });
});
