// The one measure of a side column beside the content: a Detail's Metadata, and the gap between them.
export const sideColumn = { width: 280, gap: 24 } as const;

// What a capped column widens by when a side column is drawn beside its content.
export const sideColumnExtra = (side: boolean): number =>
  side ? sideColumn.width + sideColumn.gap : 0;

// The column a Screen part offers what it holds: its widest, its padding included, centred in a wider pane.
export interface ContentColumn {
  maxWidth?: number;
  paddingLeft: number;
  paddingRight: number;
}

/*
 * How content keeps to the column itself: `fill` fills the part's height too, as a vertical scroll view or a nested
 * Screen does; `keep` keeps its own height, as a horizontal shelf or a list held to a height does; `grouped` is grouped
 * cards, which fill it and start a narrow web heading on their rows' text. `side` is not a claim on the column but a
 * report: content draws a side column beside what the column holds (a Detail's Metadata), so the Screen's capped
 * column widens by it and the content keeps its full reading width.
 */
export type ColumnClaim = 'fill' | 'keep' | 'grouped' | 'side';

export type ColumnClaims = Readonly<Record<ColumnClaim, number>>;

export const noClaims: ColumnClaims = { fill: 0, keep: 0, grouped: 0, side: 0 };

// A claim made (1) or withdrawn (-1), counted, as two pieces of content can claim one part.
export const counted =
  (claim: ColumnClaim, by: 1 | -1) =>
  (claims: ColumnClaims): ColumnClaims => ({
    ...claims,
    [claim]: claims[claim] + by,
  });

export interface ClaimState {
  // Something keeps to the column itself, so the part leaves it unpadded.
  claimed: boolean;
  // Something fills the part's height too.
  filled: boolean;
  grouped: boolean;
  // Something draws a side column beside the content, so a capped column widens by it.
  side: boolean;
}

export function claimState(claims: ColumnClaims): ClaimState {
  const filled = claims.fill + claims.grouped > 0;

  return {
    claimed: filled || claims.keep > 0,
    filled,
    grouped: claims.grouped > 0,
    side: claims.side > 0,
  };
}

export interface PartLayout extends Omit<ClaimState, 'grouped' | 'side'> {
  // The column what the part holds takes, if any.
  offered?: ContentColumn;
}

interface Offer {
  wide: boolean;
  column: ContentColumn;
  // What the part itself was offered.
  inherited?: ContentColumn;
}

/*
 * A wide part offers its column only to content that claims it, which keeps its scrollbar and fades at the pane's
 * edges; anything else the part pads itself. A phone's scroll views and grouped cards keep their platform's insets,
 * so below wide the part passes on only what it was offered.
 */
export function partLayout(state: ClaimState, offer: Offer): PartLayout {
  return {
    claimed: state.claimed,
    filled: state.filled,
    offered: offeredColumn(state, offer),
  };
}

function offeredColumn(
  state: ClaimState,
  offer: Offer,
): ContentColumn | undefined {
  if (!offer.wide) return offer.inherited;

  return state.claimed ? offer.column : undefined;
}
