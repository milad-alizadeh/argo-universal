import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { useFeedPositionSave } from './use-feed-position-save';

const saved = fn<(sessionId: string | undefined) => void>();

function Scrolling({
  sessionId,
  focused,
}: {
  sessionId: string;
  focused: boolean;
}): React.JSX.Element {
  const onScroll = useFeedPositionSave(sessionId, focused, saved);

  return <Button label="Scroll" onPress={onScroll} />;
}

function Harness(): React.JSX.Element {
  const [shown, setShown] = useState(true);
  const [focused, setFocused] = useState(true);
  const [sessionId, setSessionId] = useState('first');

  return (
    <View>
      {shown && <Scrolling sessionId={sessionId} focused={focused} />}
      <Button label="Leave" onPress={() => setShown(false)} />
      <Button label="Blur" onPress={() => setFocused(false)} />
      <Button label="Other Session" onPress={() => setSessionId('second')} />
    </View>
  );
}

const meta = {
  title: 'Tests/Feed/UseFeedPositionSave',
  component: Harness,
  tags: ['!autodocs'],
  beforeEach: (): void => {
    saved.mockClear();
  },
} satisfies Meta<typeof Harness>;

export default meta;

type Story = StoryObj<typeof meta>;

// Well inside the wait, so a save that happens was made by leaving, not by the clock.
const pressTwice = async (canvas: {
  getByRole: (role: 'button', options: { name: string }) => HTMLElement;
}): Promise<void> => {
  const scroll = canvas.getByRole('button', { name: 'Scroll' });
  await userEvent.click(scroll);
  await userEvent.click(scroll);
};

export const SavesOnceThenAfterTheLastScroll: Story = {
  play: async ({ canvas }) => {
    await pressTwice(canvas);
    await expect(saved).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(saved).toHaveBeenCalledTimes(2));
    await expect(saved).toHaveBeenLastCalledWith('first');
  },
};

export const SavesThePositionWhenLeavingJustAfterScrolling: Story = {
  play: async ({ canvas }) => {
    await pressTwice(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Leave' }));

    await expect(saved).toHaveBeenCalledTimes(2);
  },
};

export const SavesThePositionWhenBlurredJustAfterScrolling: Story = {
  play: async ({ canvas }) => {
    await pressTwice(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Blur' }));

    await expect(saved).toHaveBeenCalledTimes(2);
  },
};

export const DropsThePendingSaveWhenTheSessionChanges: Story = {
  play: async ({ canvas }) => {
    await pressTwice(canvas);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Other Session' }),
    );
    await new Promise((resolve) => setTimeout(resolve, 400));

    await expect(saved).toHaveBeenCalledTimes(1);
  },
};
