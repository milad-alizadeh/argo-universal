import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { Button } from '#primitives/button';
import { Icon } from './icon';

export interface FloatingActionButtonProps {
  accessibilityLabel: string;
  icon: PhosphorIcon;
  onPress: () => void;
}

// The phone's round primary action above the content.
export function FloatingActionButton({
  accessibilityLabel,
  icon,
  onPress,
}: FloatingActionButtonProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="size-14 sm:size-14 rounded-full"
    >
      <Icon size="lg" as={icon} className="text-primary-foreground" />
    </Button>
  );
}
