import { useState, type ReactElement } from 'react';
import { TextInput, View } from 'react-native';
import { fn } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { InspectorPane } from './inspector-pane';

function Items({ count }: { count: number }): ReactElement {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <Text key={index}>Loaded item {index}</Text>
      ))}
    </View>
  );
}

export function LoadingPage({
  short = false,
}: {
  short?: boolean;
}): ReactElement {
  const [count, setCount] = useState(0);
  const [offset, onScroll] = useState(500);

  return (
    <View className="flex-1">
      <Button onPress={() => setCount(short ? 3 : 100)} label="Load content" />
      <Button onPress={() => setCount(200)} label="Grow content" />
      <Text>Saved position {offset}</Text>
      <InspectorPane
        title="Detail"
        open
        onOpenChange={fn()}
        scrollState={{
          key: 'pending-page',
          getOffset: () => offset,
          onScroll,
          ready: count > 0,
        }}
      >
        <View>
          <TextInput accessibilityLabel="Detail note" defaultValue="" />
          {count ? <Items count={count} /> : <Text>Loading content</Text>}
        </View>
      </InspectorPane>
    </View>
  );
}
