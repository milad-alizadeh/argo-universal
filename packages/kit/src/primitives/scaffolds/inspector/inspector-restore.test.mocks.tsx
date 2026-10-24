import { useState, type ReactElement } from 'react';
import { TextInput, View } from 'react-native';
import { fn } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { InspectorPane } from './inspector-pane';
import type { InspectorProps } from './inspector-props';

const pending = {
  key: 'pending-page',
  getOffset: (): number => 500,
  onScroll: fn(),
};

type Props = { short?: boolean; explicitReady?: boolean };

type State = Props & {
  count: number;
  offset: number;
  onScroll: (offset: number) => void;
};

const loadedCount = (props: Props): number => (props.short ? 3 : 100);

function Items({ count }: { count: number }): ReactElement {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <Text key={index}>Loaded item {index}</Text>
      ))}
    </View>
  );
}

function LoadingContent({ count }: { count: number }): ReactElement {
  return count ? <Items count={count} /> : <Text>Loading content</Text>;
}

function scrollState(state: State): NonNullable<InspectorProps['scrollState']> {
  if (state.explicitReady === false) return pending;

  return {
    key: 'pending-page',
    getOffset: () => state.offset,
    onScroll: state.onScroll,
    ready: state.count > 0,
  };
}

export function LoadingScreen(props: Props): ReactElement {
  const [count, setCount] = useState(0);
  const [offset, onScroll] = useState(500);

  return (
    <View className="flex-1">
      <Button
        onPress={() => setCount(loadedCount(props))}
        label="Load content"
      />
      <Button onPress={() => setCount(200)} label="Grow content" />
      <Text>Saved position {offset}</Text>
      <InspectorPane
        title="Detail"
        open
        onOpenChange={fn()}
        scrollState={scrollState({ ...props, count, offset, onScroll })}
      >
        <View>
          <TextInput accessibilityLabel="Detail note" defaultValue="" />
          <LoadingContent count={count} />
        </View>
      </InspectorPane>
    </View>
  );
}
