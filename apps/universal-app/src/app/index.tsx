import { StyleSheet, Text, View } from 'react-native';

// Placeholder until @argo/client provides ProjectsScreen.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text>Projects</Text>
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
