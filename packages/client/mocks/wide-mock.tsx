import { Text } from 'react-native';
import { useWide } from '../src/navigation/use-wide';

export function WideMock() {
  return <Text>{useWide() ? 'Wide layout' : 'Phone layout'}</Text>;
}
