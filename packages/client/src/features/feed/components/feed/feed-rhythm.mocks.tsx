import { Button } from '@repo/kit/primitives/actions/button';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import {
  recordedAgentMessage,
  recordedImageUrl,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import type { FeedViewItem } from '../../view/feed-view';
import { Feed } from './feed';

export const rhythmText = {
  firstUser: 'Explain the change.',
  agent: 'The change is ready for review.',
  nextUser: 'Run the next check.',
};

const user = recordedUserMessage('agent-1', 'edit-and-command');

const agent = recordedAgentMessage('agent-1', 'edit-and-command');

const initial: FeedViewItem[] = [
  {
    type: 'row',
    row: { ...user, content: [{ type: 'text', text: rhythmText.firstUser }] },
  },
  {
    type: 'row',
    row: { ...agent, content: [{ type: 'text', text: rhythmText.agent }] },
  },
];

const next: FeedViewItem = {
  type: 'row',
  row: {
    ...user,
    id: 'next-user-rhythm',
    content: [{ type: 'text', text: rhythmText.nextUser }],
  },
};

// The settled Agent item keeps its identity when the next prompt arrives, as the live Feed does.
export function ArrivingPrompt(): React.JSX.Element {
  const [items, setItems] = useState(initial);

  return (
    <View className="min-h-0 flex-1">
      <Button label="Send next" onPress={() => setItems([...initial, next])} />
      <Feed
        items={items}
        liveHeader={null}
        loadingOlder={false}
        onStartReached={() => {}}
        imageUrl={recordedImageUrl}
      />
    </View>
  );
}
