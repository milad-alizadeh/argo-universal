import type { LegendListRef } from '@legendapp/list/react-native';
import { Button } from '@repo/kit/primitives/actions/button';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { useFeedOnScroll } from './feed-scroll-drawing';
import { scrollMemory } from './feed-scroll-memory';

const sessionId = 'unmounting-session';

const rows = Array.from({ length: 80 }, (_, index) => ({
  id: `row-${index + 1}`,
  title: `Row ${index + 1}`,
}));

let lastAnchor: ReturnType<LegendListRef['anchorVisibleContent']>;

function ScrollingFeed(): React.JSX.Element {
  const list = useRef<LegendListRef>(null);
  const onScroll = useFeedOnScroll(sessionId, list);

  return (
    <View className="flex-1">
      <Button
        label="Scroll a little"
        onPress={() => {
          void list.current?.scrollToOffset({ offset: 600, animated: false });
        }}
      />
      <Button
        label="Scroll further"
        onPress={() => {
          void list.current?.scrollToOffset({ offset: 1500, animated: false });
        }}
      />
      <Button
        label="Note the anchor"
        onPress={() => {
          lastAnchor = list.current?.anchorVisibleContent({ hold: false });
        }}
      />
      <List
        ref={list}
        items={rows}
        appearance="plain"
        estimatedItemSize={56}
        keyExtractor={(item): string => item.id}
        renderItem={(item): React.JSX.Element => (
          <ListItem title={item.title} />
        )}
        onScroll={onScroll}
      />
    </View>
  );
}

function Screen(): React.JSX.Element {
  const [shown, setShown] = useState(true);

  return (
    <View className="flex-1">
      <Button label="Leave" onPress={() => setShown(false)} />
      {shown && <ScrollingFeed />}
    </View>
  );
}

const meta = {
  title: 'Tests/Feed/PositionUnmount',
  component: Screen,
  parameters: { screenPreview: true },
  tags: ['!autodocs'],
  beforeEach: (): void => {
    scrollMemory.write(sessionId, null);
  },
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LeavingRightAfterScrollingKeepsTheLastPosition: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Scroll a little' }),
    );
    await waitFor(() => expect(scrollMemory.read(sessionId)).not.toBeNull());
    const first = scrollMemory.read(sessionId);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Scroll further' }),
    );
    // The list is further on than the position kept so far, and the save for it is still waiting.
    await waitFor(async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Note the anchor' }),
      );
      await expect(lastAnchor).not.toEqual(first);
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Leave' }));

    await expect(scrollMemory.read(sessionId)).toEqual(lastAnchor);
  },
};
