import type { ConversationPartial } from '@repo/contracts';
import { renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, Profiler, useState } from 'react';
import { Button } from 'react-native';
import { expect } from 'storybook/test';
import { personSaid, voiceSaid } from '../transcript/transcript-fixtures';
import { Feed } from './feed';
import { feedArgs } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed/ConversationRenders',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

const history = [personSaid.item];

const person: ConversationPartial = {
  speaker: 'person',
  id: 'held',
  rowId: 'held-person',
  text: 'Please check it again',
};

const voice: ConversationPartial = {
  speaker: 'voice',
  id: voiceSaid.item.row.messageId,
  rowId: voiceSaid.item.row.id,
  text: 'The release',
};

const continued = 'The release checks are ready';

const renders = renderCounter();

function SpeakingFeed(): JSX.Element {
  const [text, setText] = useState(voice.text);
  const [repeated, setRepeated] = useState(false);

  const partials = [{ ...person }, { ...voice, text }];

  return (
    <>
      <Button title="Speak" onPress={() => setText(continued)} />
      <Profiler id={renders.id} onRender={renders.onRender}>
        <Button
          title={repeated ? 'Repeated' : 'Repeat'}
          onPress={() => setRepeated(true)}
        />
        <Feed
          {...feedArgs}
          sessionId="session-1"
          items={history}
          partials={partials}
        />
      </Profiler>
    </>
  );
}

export const OnlyTheChangingPartialRenders: Story = {
  render: () => <SpeakingFeed />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('phone');
    await canvas.findByText(person.text);
    await canvas.findByText(voice.text);

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Speak' }));
      await canvas.findByText(
        (_text, element) =>
          element?.getAttribute('data-testid') === 'feed-column' &&
          element.textContent === continued,
      );
    });

    await expect(counts.FeedRow?.updates).toMatchObject([
      { entry: { row: { id: voice.rowId } } },
    ]);

    const repeated = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Repeat' }));
      await canvas.findByRole('button', { name: 'Repeated' });
    });

    await expect(repeated.FeedList).toBeUndefined();
    await expect(repeated.FeedRow).toBeUndefined();
  },
};
