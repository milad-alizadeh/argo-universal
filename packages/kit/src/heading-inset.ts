import {
  createContext,
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
  claimColumn: () => () => void;
}

// Set by a Screen around its heading and content; a FieldGroup or a sheet clears it for what it holds, so nothing nested in one tells the Screen again.
export const HeadingInsetContext = createContext<HeadingInset | undefined>(
  undefined,
);

// A Screen's: it learns whether its content is grouped cards, and whether it keeps to the column itself.
export function useHeadingInsetScope(): HeadingInset {
  const [grouped, register] = useState(false);
  const [claims, setClaims] = useState(0);

  const claimColumn = useCallback(() => {
    setClaims((count) => count + 1);

    return (): void => setClaims((count) => count - 1);
  }, []);

  return useMemo(
    () => ({ grouped, register, columnClaimed: claims > 0, claimColumn }),
    [grouped, claims, claimColumn],
  );
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

  useLayoutEffect(() => {
    register?.(true);

    return (): void => register?.(false);
  }, [register]);
}

// Content that keeps to the column itself tells its Screen while it is drawn, before the first paint, so the Screen never pads it twice.
export function useClaimsColumn(claims: boolean): void {
  const claimColumn = use(HeadingInsetContext)?.claimColumn;

  useLayoutEffect(
    () => (claims ? claimColumn?.() : undefined),
    [claims, claimColumn],
  );
}

// Whether the Screen's content keeps to its column itself: grouped cards and scroll views do; anything else, the Screen keeps there.
export function useColumnClaimed(): boolean {
  const scope = use(HeadingInsetContext) ?? unscoped;

  return scope.grouped || scope.columnClaimed;
}

const unscoped = { grouped: false, columnClaimed: false };
