import type * as React from 'react';
import { Text, View } from 'react-native';
import { SizeClass } from '../size-class/size-class';
import { useSizeClass } from './use-size-class';

export function SizeClassMock(): React.JSX.Element {
  return (
    <View>
      <Text>{`${useSizeClass()} layout`}</Text>
      <Text className="hidden medium:flex">Medium breakpoint</Text>
      <Text className="hidden wide:flex">Wide breakpoint</Text>
      <SizeClass only="compact">
        <Text>Compact content</Text>
      </SizeClass>
      <SizeClass only="wide">
        <Text>Wide content</Text>
      </SizeClass>
    </View>
  );
}
