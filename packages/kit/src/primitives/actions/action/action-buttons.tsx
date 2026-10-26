import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import type { IconButtonSize } from '#primitives/actions/icon-button';
import { useDeclaredActions } from './declared-actions';
import { headerSlots } from './header-actions';
import { HeaderActions } from './header-buttons';

export interface ActionButtonsProps {
  // An `actions` Slot's Actions and Sections.
  actions: ReactNode;
  // The overflow menu's spoken name.
  label?: string;
  // A section header's buttons are small; a header's keep the IconButton default.
  size?: IconButtonSize;
}

// An `actions` Slot drawn where it is: buttons and an overflow menu, as an Argo-drawn header draws them, with the Actions' shortcuts.
export function ActionButtons(props: ActionButtonsProps): ReactElement | null {
  const declared = useDeclaredActions(props.actions);

  if (!declared.actions.length) return null;

  return (
    <View nativeID={declared.id}>
      <HeaderActions
        groups={declared.groups}
        label={props.label ?? 'More actions'}
        slots={headerSlots}
        size={props.size}
      />
    </View>
  );
}

// A declaration its owner draws elsewhere keeps an empty node on the web, where its shortcuts run only while that node is shown.
export function ShortcutAnchor({ id }: { id: string }): ReactElement | null {
  return Platform.OS === 'web' ? <View nativeID={id} /> : null;
}
