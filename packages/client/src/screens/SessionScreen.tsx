import { View } from 'react-native';
import { Text } from '#primitives/text';

export interface SessionScreenProps {
  id: string;
}

// Placeholder until milestone 1 shows the Feed.
export function SessionScreen({ id }: SessionScreenProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background p-6">
      <Text variant="h3">Session</Text>
      <Text variant="muted">{id}</Text>
    </View>
  );
}
