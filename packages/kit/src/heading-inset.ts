import { createContext, use, useLayoutEffect, useMemo, useState } from 'react';
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
}

// Set by a Screen around its heading and content; a FieldGroup clears it for what it holds, so a nested one never tells the Screen again.
export const HeadingInsetContext = createContext<HeadingInset | undefined>(
  undefined,
);

// A Screen's: it learns whether its content is grouped cards.
export function useHeadingInsetScope(): HeadingInset {
  const [grouped, register] = useState(false);

  return useMemo(() => ({ grouped, register }), [grouped]);
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
