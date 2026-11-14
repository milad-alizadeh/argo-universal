import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import { RetainedPageVisibility } from '@repo/kit/use-shown-page';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fireEvent, spyOn, waitFor } from 'storybook/test';
import { scrolledToEnd } from '../../../features/feed/components/feed/feed-reader.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { longSession } from './session-detail-view.mocks';

const earlierItems = longSession.feed.items.slice(0, -1);

const itemsAfterUpdate = (updated: boolean): typeof longSession.feed.items =>
  updated ? longSession.feed.items : earlierItems;

function NavigationPreview(): React.JSX.Element {
  const [shown, setShown] = useState(true);
  const [updated, setUpdated] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Button
        label={shown ? 'Open Issues' : 'Return to Session'}
        onPress={() => setShown(!shown)}
      />
      <Button label="Receive Feed update" onPress={() => setUpdated(true)} />
      <RetainedPageVisibility value={shown}>
        <View style={{ flex: 1, display: shown ? 'flex' : 'none' }}>
          <FramedSessionPreview
            state="open"
            {...longSession}
            feed={{
              ...longSession.feed,
              items: itemsAfterUpdate(updated),
            }}
          />
        </View>
      </RetainedPageVisibility>
    </View>
  );
}

const meta = {
  title: 'Tests/Screens/Sessions/Session/Navigation',
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const HiddenFeedReceivesAnUpdate: Story = {
  render: () => <NavigationPreview />,
  play: async ({ canvas, userEvent }) => {
    const errors = spyOn(console, 'error');

    try {
      const scroll = await canvas.findByTestId('feed-scroll');
      await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
      await expect(scroll.scrollTop).toBeGreaterThan(scroll.clientHeight);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open Issues' }),
      );
      await waitFor(() => expect(scroll).not.toBeVisible());
      // A navigator can reset the hidden DOM scroller before Legend receives its scroll event.
      scroll.scrollTop = 0;
      await fireEvent.click(
        canvas.getByRole('button', { name: 'Receive Feed update' }),
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Return to Session' }),
      );
      await waitFor(() => expect(scroll).toBeVisible());
      await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
      await expect(
        errors.mock.calls
          .flat()
          .filter(
            (part) => typeof part === 'string' && part.includes('flushSync'),
          ),
      ).toEqual([]);
    } finally {
      errors.mockRestore();
    }
  },
};
