import type * as React from 'react';
import { Text, View } from 'react-native';
import { useWide } from '../src/navigation/use-wide';

export function WideMock(): React.JSX.Element {
  const wide = useWide();
  return (
    <View>
      <Text>{wide ? 'Wide layout' : 'Phone layout'}</Text>
      <Text className="hidden wide:flex">Wide breakpoint</Text>
    </View>
  );
}
