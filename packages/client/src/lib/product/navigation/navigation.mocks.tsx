import type * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigate } from './context';

export function NavigationMock(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigate({ to: 'session', id: 'session-1' })}
      >
        <Text>Go to the Session</Text>
      </Pressable>
    </View>
  );
}
