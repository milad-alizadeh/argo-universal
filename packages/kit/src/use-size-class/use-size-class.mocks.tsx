import type * as React from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SizeClass } from '../size-class/size-class';
import { useSizeClass } from './use-size-class';

export function SizeClassMock(): React.JSX.Element {
  return (
    <View>
      <Text>{`${useSizeClass()} layout`}</Text>
      <Text className="hidden medium:flex">Medium breakpoint</Text>
      <Text className="hidden wide:flex">Wide breakpoint</Text>
      <Gates />
    </View>
  );
}

function Gates(): React.JSX.Element {
  return (
    <>
      <SizeClass only="compact">
        <Text>Compact content</Text>
      </SizeClass>
      <SizeClass only="wide">
        <Text>Wide content</Text>
      </SizeClass>
      <Slots />
    </>
  );
}

function Slots(): React.JSX.Element {
  return (
    <SizeClass
      compact={<Counter label="Compact count" />}
      wide={<Counter label="Wide count" />}
    />
  );
}

// A count the press raises, so a remount would show it back at zero.
function Counter({ label }: { label: string }): React.JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <Pressable role="button" onPress={() => setCount(count + 1)}>
      <Text>{`${label} ${count}`}</Text>
    </Pressable>
  );
}
