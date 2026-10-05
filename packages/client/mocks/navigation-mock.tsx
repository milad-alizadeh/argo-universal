import { Pressable, Text, View } from 'react-native';
import { useNavigate } from '../src/navigation/context';

export function NavigationMock() {
  const navigate = useNavigate();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigate({ to: 'session', id: 'session-1' })}
      >
        <Text>Open Session</Text>
      </Pressable>
    </View>
  );
}
