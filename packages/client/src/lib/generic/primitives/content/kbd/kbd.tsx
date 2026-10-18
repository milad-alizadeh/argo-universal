import { Platform, View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { KitProps } from '../../kit-props';

export type KbdProps = KitProps<'Kbd'>;

export function Kbd({ keys }: KbdProps): React.JSX.Element | null {
  if (Platform.OS !== 'web') return null;

  return (
    <View
      className="flex-row items-center gap-0.5"
      accessibilityLabel={keys.join(' + ')}
    >
      {keys.map((key) => (
        <KeyCap key={key} label={key} />
      ))}
    </View>
  );
}

function KeyCap({ label }: { label: string }): React.JSX.Element {
  return (
    <View className="min-w-5 items-center justify-center rounded-sm bg-tint px-1 py-0.5">
      <Text className="text-muted-foreground text-xs leading-4 font-medium">
        {label}
      </Text>
    </View>
  );
}
