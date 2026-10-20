import type { ReactNode, JSX } from 'react';
import { Platform } from 'react-native';
import { LiquidGlass } from '#primitives/content/liquid-glass';
import { List } from '#primitives/lists/list';

// A phone opens the status controls in a sheet whose grouped List scrolls itself, as Settings does.
export const phoneSheet = Platform.OS !== 'web';

// The grouped List a status sheet draws its sections in: it fills the sheet and scrolls itself.
export function StatusSheetList({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <List appearance="grouped" fit={false}>
      {children}
    </List>
  );
}

export const mutedTextClassName = 'text-muted-foreground';

export const unselectableTextClassName = 'select-none';

export const chipClassName =
  'h-full sm:h-full py-0 px-2.5 gap-1.5 rounded-full';

interface ChipSurfaceProps {
  glass?: boolean;
  children: ReactNode;
}

const chipSurfaceProps = {
  corners: 'pill',
  interactive: true,
  className: 'h-6',
  fallbackClassName: 'rounded-full border border-border bg-card shadow-card',
} as const;

export function ChipSurface({
  glass,
  children,
}: ChipSurfaceProps): JSX.Element {
  return (
    <LiquidGlass {...chipSurfaceProps} glass={glass}>
      {children}
    </LiquidGlass>
  );
}
