import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { ListIcon } from 'phosphor-react-native';
import { HeaderButton } from './HeaderButton';
import { useOpenDrawer } from './PhoneShell';

export interface PhoneMenuButtonProps {
  attentionCount?: number;
}

// ☰ at the leading edge of a phone section's header; opens the drawer of sections.
export function PhoneMenuButton({ attentionCount = 0 }: PhoneMenuButtonProps) {
  const openDrawer = useOpenDrawer();
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
