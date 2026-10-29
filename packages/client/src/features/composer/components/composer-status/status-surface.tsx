import { List, phonesGrouped } from '@repo/kit/primitives/lists/list';
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
    <List appearance="cards" onPhones={phonesGrouped} fit={false}>
      {children}
    </List>
  );
}

export const mutedTextClassName = 'text-muted-foreground';

export const unselectableTextClassName = 'select-none';
