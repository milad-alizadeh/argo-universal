import { groupedOnPhones } from '@repo/kit/list-grouped';
import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import { List } from '@repo/kit/primitives/lists/list';
import type { ReactNode, JSX } from 'react';
import { Platform } from 'react-native';

// A phone opens the status controls in a sheet whose grouped List scrolls itself, as Settings does.
export const phoneSheet = Platform.OS !== 'web';

// The grouped List a status sheet draws its sections in: it fills the sheet and scrolls itself.
export function StatusSheetList({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <List appearance={groupedOnPhones('cards')} fit={false}>
      {children}
    </List>
  );
}

export const mutedTextClassName = 'text-muted-foreground';

export const unselectableTextClassName = 'select-none';

export const chipClassName =
  'h-full sm:h-full py-0 px-2.5 gap-1.5 rounded-full';

const chipSurfaceProps = {
  corners: 'pill',
  interactive: true,
  className: 'h-6',
  fallbackClassName: 'rounded-full border border-border bg-card shadow-card',
} as const;

// Every status control draws the same Pill surface: glass on iOS, a bordered card elsewhere.
export function ChipSurface({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return <LiquidGlass {...chipSurfaceProps}>{children}</LiquidGlass>;
}
