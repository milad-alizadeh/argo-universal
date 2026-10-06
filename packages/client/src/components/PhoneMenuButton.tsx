import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { ListIcon } from 'phosphor-react-native';
import { HeaderButton } from './HeaderButton';
import { useOpenDrawer, useShellAttentionCount } from './PhoneShell';

// ☰ at the leading edge of a phone section's header; opens the drawer of sections.
export function PhoneMenuButton() {
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
