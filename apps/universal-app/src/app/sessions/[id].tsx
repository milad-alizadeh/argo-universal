import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

// Placeholder until @argo/client provides SessionScreen.
export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Text>Session {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
