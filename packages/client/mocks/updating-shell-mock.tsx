import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../src/primitives/button';
import { Text } from '../src/primitives/text';
import { DesktopShellMock } from './desktop-shell-mock';

export function UpdatingShellMock(): React.JSX.Element {
  const [attentionCount, setAttentionCount] = useState(1);
  return (
    <View className="h-[700px] w-full">
      <DesktopShellMock attentionCount={attentionCount} showInspectorControls />
      <Button
        accessibilityLabel="Update attention"
        onPress={() => setAttentionCount(2)}
      >
        <Text>Update attention</Text>
      </Button>
    </View>
  );
}
