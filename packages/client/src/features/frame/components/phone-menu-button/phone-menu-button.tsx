import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import type * as React from 'react';
import { HeaderButton } from '#lib/product/header-button';

export interface PhoneMenuButtonProps {
  // Sessions that need attention; any puts a dot on ☰.
  attentionCount: number;
  // Opens the Frame's drawer; the app's navigator supplies it.
  onOpen: () => void;
}

// A light tap, then the drawer.
const openWithHaptic = (onOpen: () => void) => (): void => {
  void impactAsync(ImpactFeedbackStyle.Light);
  onOpen();
};

// ☰ at the leading edge of a narrow section root's header: a header item sized like the trailing ones.
export function PhoneMenuButton({
  attentionCount,
  onOpen,
}: PhoneMenuButtonProps): React.JSX.Element {
  return (
    <HeaderButton
      icon="menu"
      dot={attentionCount > 0 ? 'attention' : undefined}
      accessibilityLabel="Open navigation"
      onPress={openWithHaptic(onOpen)}
    />
  );
}
