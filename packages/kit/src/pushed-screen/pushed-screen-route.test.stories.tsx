import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { expect, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { withStack } from '#story-stack';

function Root(): ReactElement {
  const router = useRouter();

  return (
    <Button
      label="Open a link"
      onPress={() =>
        router.push({ pathname: '/screen/[id]', params: { id: 'zzz' } })
      }
    />
  );
}

const meta = {
  title: 'Tests/PushedScreen/Route',
  component: Root,
  decorators: [withStack()],
} satisfies Meta<typeof Root>;

export default meta;

type Story = StoryObj<typeof meta>;

// A link to `/screen/zzz` names no pushed page: it lands on the not-found page, not a blank page titled `[id]`.
export const AnIdNoOpenerPushedIsNotFound: Story = {
  beforeEach: async () => {
    await settleLayout('wide');
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open a link' }),
    );
    await waitFor(() => expect(canvas.getByText('Not found')).toBeVisible());
    await expect(canvas.queryByText('[id]')).toBeNull();
  },
};
