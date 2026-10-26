import { use, useLayoutEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';
import { useColumnClaims } from './column-claims';
import {
  type HeadingInset,
  HeadingInsetContext,
} from './heading-inset-context';

export { HeadingInsetContext };

/*
 * A grouped row's own inset: its text starts this far inside its card. Content drawn as grouped cards (a FieldGroup)
 * tells the Screen above it, so a phone-width web heading starts on the same line as the section and row titles.
 */
export const groupedRowInset = 16;

// A Screen's: it learns whether its content is grouped cards, and whether it keeps to the column itself.
export function useHeadingInsetScope(): HeadingInset {
  const [grouped, register] = useState(false);
  const { columnClaimed, columnFilled, claimColumn } = useColumnClaims();

  return useMemo(
    () => ({ grouped, register, columnClaimed, columnFilled, claimColumn }),
    [grouped, columnClaimed, columnFilled, claimColumn],
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
