import { type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { TextArea } from '#primitives/controls/text-area';
import { ScrollView } from '#primitives/layout/scroll-view';
import { Detail } from '#primitives/scaffolds/detail';
import { Canvas } from '#primitives/visual';
import { issue } from '../detail/detail.mocks';
import { Screen } from './index';

// An Issue page with its Metadata in the aside, in a container of the given width.
export function AsideExample({ width }: { width: number }): ReactElement {
  return (
    <View className="h-120 border border-border" style={{ width }}>
      <Screen title={issue.title} aside={issue.aside}>
        <Detail {...issue.detail} />
      </Screen>
    </View>
  );
}

const cells = Array.from({ length: 48 }, (_, index) => ({
  key: `cell-${index}`,
  x: (index % 12) * 30,
  y: Math.floor(index / 12) * 30,
  width: 26,
  height: 26,
  tone: index % 5 === 0 ? 'accent' : 'muted',
})) satisfies Parameters<typeof Canvas.Rect>[0][];

// A canvas that runs to the page's edges under its title, as a map or a whiteboard does.
export function BleedExample(): ReactElement {
  return (
    <Screen title="Board" width="bleed">
      <Canvas label="Board" width={360} height={120} camera="pan-zoom">
        {cells.map(({ key, ...cell }) => (
          <Canvas.Rect key={key} {...cell} />
        ))}
      </Canvas>
    </Screen>
  );
}

const messages = [
  'Can you summarise the open Issues?',
  'Three are open: sync fails on large repos, the sidebar flickers on resize, and pairing times out.',
];

// A chat: the messages scroll, the message field stays at the foot.
export function FooterExample(): ReactElement {
  return (
    <Screen title="Chat" footer={<MessageField />}>
      <ScrollView>
        <View className="gap-3">
          {messages.map((message) => (
            <Text key={message}>{message}</Text>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function MessageField(): ReactElement {
  const [draft, setDraft] = useState('');
  const send = (): void => setDraft('');

  return (
    <TextArea
      label="Message"
      value={draft}
      onChangeText={setDraft}
      onSubmit={send}
      action={
        <IconButton icon="arrow-up" accessibilityLabel="Send" onPress={send} />
      }
    />
  );
}
