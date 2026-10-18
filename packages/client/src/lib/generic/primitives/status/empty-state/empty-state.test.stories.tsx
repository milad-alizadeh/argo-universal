import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { EmptyState } from './empty-state';

const onPress = fn();

const session = {
  icon: 'sessions',
  title: 'No Sessions yet',
  description: 'Start a Session to work with an Agent.',
  action: <Button label="New Session" onPress={onPress} />,
};

const meta = {
  title: 'Tests/EmptyState',
  component: EmptyState,
  args: session,
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentAndAction: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('heading', { name: session.title }),
    ).toBeVisible();
    await expect(canvas.getByText(session.description)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'New Session' }));
    await expect(onPress).toHaveBeenCalledOnce();
  },
};

export const NoAction: Story = {
  args: {
    title: 'Select a Session',
    description: 'Choose a Session from the list.',
    action: undefined,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Select a Session' }),
    ).toBeVisible();
    await expect(
      canvas.getByText('Choose a Session from the list.'),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const TitleOnly: Story = {
  args: {
    icon: undefined,
    title: 'No Plugins added',
    description: undefined,
    action: undefined,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'No Plugins added' }),
    ).toBeVisible();
    await expect(canvas.queryByText(session.description)).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const Search: Story = {
  args: {
    icon: 'search',
    title: 'No matching Sessions',
    description: 'No Session has “deploy” in its title.',
    action: undefined,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'No matching Sessions' }),
    ).toBeVisible();
    await expect(
      canvas.getByText('No Session has “deploy” in its title.'),
    ).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};
