import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { ListIcon } from 'phosphor-react-native';
import type * as React from 'react';
import { HeaderButton } from './header-button';
import { useOpenDrawer, useShellAttentionCount } from './phone-shell';

// ☰ at the leading edge of a phone section's header; opens the drawer of sections.
export function PhoneMenuButton(): React.JSX.Element {
  const openDrawer = useOpenDrawer();
  const attentionCount = useShellAttentionCount();
  return (
    <HeaderButton
      icon={ListIcon}
      leading
      dot={attentionCount > 0 ? 'attention' : undefined}
      accessibilityLabel="Open navigation"
      onPress={() => {
        void impactAsync(ImpactFeedbackStyle.Light);
        openDrawer();
      }}
    />
  );
}
