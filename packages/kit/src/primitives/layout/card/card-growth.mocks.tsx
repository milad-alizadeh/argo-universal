import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Card } from './card';

export const arrivingCopy = 'Content arriving while the card opens. '.repeat(3);

export function GrowingCards(): ReactElement {
  const [loaded, load] = useState(false);

  return (
    <View className="m-4 w-frame-list gap-2">
      <Button label="Load content" onPress={() => load(true)} />
      <Card kind="glass" collapsible title="First">
        <Text>{loaded ? arrivingCopy : 'One line.'}</Text>
      </Card>
      <Card kind="glass" collapsible defaultOpen title="Second">
        <Text>Neighbour below.</Text>
      </Card>
    </View>
  );
}
