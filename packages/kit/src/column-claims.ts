import {
  type Dispatch,
  type SetStateAction,
  use,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react';
import { HeadingInsetContext } from './heading-inset-context';

// What a Screen knows of the parts that keep to its column themselves.
export interface ColumnClaims {
  // Content that keeps to the Screen's column itself: a scroll view, which takes it as ScrollColumnContext, or a nested Screen.
  columnClaimed: boolean;
  // Content that also fills the Screen's height, as a vertical scroll view does; a horizontal shelf keeps its own.
  columnFilled: boolean;
  claimColumn: (fills: boolean) => () => void;
}

interface Claims {
  claims: number;
  fills: number;
}

const noClaims: Claims = { claims: 0, fills: 0 };

const counted =
  (fills: boolean, by: number) =>
  (count: Claims): Claims => ({
    claims: count.claims + by,
    fills: fills ? count.fills + by : count.fills,
  });

function useClaimCounter(
  setClaims: Dispatch<SetStateAction<Claims>>,
): ColumnClaims['claimColumn'] {
  return useCallback(
    (fills) => {
      setClaims(counted(fills, 1));

      return (): void => setClaims(counted(fills, -1));
    },
    [setClaims],
  );
}

export function useColumnClaims(): ColumnClaims {
  const [claims, setClaims] = useState(noClaims);
  const claimColumn = useClaimCounter(setClaims);

  return {
    columnClaimed: claims.claims > 0,
    columnFilled: claims.fills > 0,
    claimColumn,
  };
}

const unscoped = { grouped: false, columnClaimed: false, columnFilled: false };

// Content that keeps to the column itself tells its Screen while it is drawn, before the first paint, so the Screen never pads it twice.
export function useClaimsColumn(claims: boolean, fills = true): void {
  const claimColumn = use(HeadingInsetContext)?.claimColumn;

  useLayoutEffect(
    () => (claims ? claimColumn?.(fills) : undefined),
    [claims, fills, claimColumn],
  );
}

const useClaimedBy = (key: 'columnClaimed' | 'columnFilled'): boolean => {
  const scope = use(HeadingInsetContext) ?? unscoped;

  return scope.grouped || scope[key];
};

// Whether the Screen's content keeps to its column itself: grouped cards and scroll views do; anything else, the Screen keeps there.
export const useColumnClaimed = (): boolean => useClaimedBy('columnClaimed');

// Whether the content fills the Screen's height too: grouped cards and vertical scroll views do.
export const useColumnFilled = (): boolean => useClaimedBy('columnFilled');
