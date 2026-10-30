import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, spyOn, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { useStackPush, withStack } from '#story-stack';
import { usePageFocused } from './use-shown-page';

function Probe({ name }: { name: string }): ReactElement {
  return <Text testID={name}>{usePageFocused() ? 'focused' : 'behind'}</Text>;
}

function Root(): ReactElement {
  const push = useStackPush();

  return (
    <View>
      <Probe name="root" />
      <Button label="Open Detail" onPress={() => push('detail')} />
    </View>
  );
}

function Detail(): ReactElement {
  const router = useRouter();

  return (
    <View>
      <Probe name="detail" />
      <Button label="Go back" onPress={() => router.back()} />
    </View>
  );
}

const meta = {
  title: 'Tests/UseShownPage',
  component: Root,
  decorators: [withStack({ detail: Detail })],
} satisfies Meta<typeof Root>;

export default meta;

type Story = StoryObj<typeof meta>;

// React Navigation warns about `isFocused()` once per page load, so this story comes first: a later story would find it already spent.
export const AskingForFocusDoesNotWarnWhileRendering: Story = {
  beforeEach: async () => {
    await settleLayout('wide');
    const warn = spyOn(console, 'warn');

    return () => warn.mockRestore();
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByTestId('root')).toHaveTextContent('focused'),
    );
    await expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('isFocused() was called while rendering'),
    );
  },
};

// A page its stack keeps behind the shown one is not focused, and is again when the shown one goes.
export const AStackedPageIsNotFocused: Story = {
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas, userEvent }) => {
    await waitFor(() =>
      expect(canvas.getByTestId('root')).toHaveTextContent('focused'),
    );

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open Detail' }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId('detail')).toHaveTextContent('focused'),
    );
    await expect(canvas.getByTestId('root')).toHaveTextContent('behind');

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Go back' }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId('root')).toHaveTextContent('focused'),
    );
    await expect(canvas.queryByTestId('detail')).toBeNull();
  },
};
