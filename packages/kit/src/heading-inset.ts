import {
  createContext,
  type Dispatch,
  type SetStateAction,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';

/*
 * A grouped row's own inset: its text starts this far inside its card. Content drawn as grouped cards (a FieldGroup)
 * tells the Screen above it, so a phone-width web heading starts on the same line as the section and row titles.
 */
export const groupedRowInset = 16;

interface HeadingInset {
  grouped: boolean;
  register: (grouped: boolean) => void;
  // Content that keeps to the Screen's column itself: a scroll view, which takes it as ScrollColumnContext, or a nested Screen.
  columnClaimed: boolean;
  // Content that also fills the Screen's height, as a vertical scroll view does; a horizontal shelf keeps its own.
  columnFilled: boolean;
  claimColumn: (fills: boolean) => () => void;
}

// Set by a Screen around its heading and content; a FieldGroup or a sheet clears it for what it holds, so nothing nested in one tells the Screen again.
export const HeadingInsetContext = createContext<HeadingInset | undefined>(
  undefined,
);

// A Screen's: it learns whether its content is grouped cards, and whether it keeps to the column itself.
export function useHeadingInsetScope(): HeadingInset {
  const [grouped, register] = useState(false);
  const [claims, setClaims] = useState(noClaims);
  const claimColumn = useClaimCounter(setClaims);

  return useMemo(
    () => ({
      grouped,
      register,
      columnClaimed: claims.claims > 0,
      columnFilled: claims.fills > 0,
      claimColumn,
    }),
    [grouped, claims, claimColumn],
  );
}

// How many parts claim the column, and how many of them fill its height too.
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
): HeadingInset['claimColumn'] {
  return useCallback(
    (fills) => {
      setClaims(counted(fills, 1));

      return (): void => setClaims(counted(fills, -1));
    },
    [setClaims],
  );
}

const registerGrouped = (
  register: HeadingInset['register'] | undefined,
): (() => void) => {
  register?.(true);

  return (): void => register?.(false);
};

// One part of a Screen's body: it keeps its own claim on the column, and tells the Screen when it holds grouped cards.
export function useBodyPartScope(): HeadingInset {
  const scope = useHeadingInsetScope();
  const register = use(HeadingInsetContext)?.register;

  useLayoutEffect(
    () => (scope.grouped ? registerGrouped(register) : undefined),
    [scope.grouped, register],
  );

  return scope;
}

// Web only, as native headers are the platform's, and a wide window's heading follows the FieldGroup's column.
export const useHeadingInset = (): number =>
  useGroupedNarrowWeb() ? groupedRowInset : 0;

function useGroupedNarrowWeb(): boolean {
  const scope = use(HeadingInsetContext);

  return useNarrowWeb() && Boolean(scope?.grouped);
}

const useNarrowWeb = (): boolean => !useWide() && Platform.OS === 'web';

// Grouped content tells its Screen while it is drawn.
export function useGroupedContent(): void {
  const register = use(HeadingInsetContext)?.register;

  useLayoutEffect(() => registerGrouped(register), [register]);
}

// Content that keeps to the column itself tells its Screen while it is drawn, before the first paint, so the Screen never pads it twice.
export function useClaimsColumn(claims: boolean, fills = true): void {
  const claimColumn = use(HeadingInsetContext)?.claimColumn;

  useLayoutEffect(
    () => (claims ? claimColumn?.(fills) : undefined),
    [claims, fills, claimColumn],
  );
}

// Whether the Screen's content keeps to its column itself: grouped cards and scroll views do; anything else, the Screen keeps there.
export function useColumnClaimed(): boolean {
  const scope = use(HeadingInsetContext) ?? unscoped;

  return scope.grouped || scope.columnClaimed;
}

// Whether the content fills the Screen's height too: grouped cards and vertical scroll views do.
export function useColumnFilled(): boolean {
  const scope = use(HeadingInsetContext) ?? unscoped;

  return scope.grouped || scope.columnFilled;
}

const unscoped = { grouped: false, columnClaimed: false, columnFilled: false };
