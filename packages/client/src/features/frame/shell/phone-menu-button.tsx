import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { HeaderButton } from '#lib/product/header-button';
import { useAttentionCount } from '../hooks/use-attention-count';

// ☰ at the leading edge of a narrow web window's section header; opens the drawer of sections. Phones show the drawer header's own ☰.
export function PhoneMenuButton(): React.JSX.Element {
  const navigation = useNavigation();
  const attentionCount = useAttentionCount();

  return (
    <HeaderButton
      icon="menu"
      dot={attentionCount > 0 ? 'attention' : undefined}
      accessibilityLabel="Open navigation"
      onPress={() => {
        void impactAsync(ImpactFeedbackStyle.Light);
        navigation.dispatch(DrawerActions.openDrawer());
      }}
    />
  );
}
