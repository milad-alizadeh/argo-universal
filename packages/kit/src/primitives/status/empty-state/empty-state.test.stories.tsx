import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Callout } from '../callout';
import { Spinner } from '../spinner';
import { EmptyState } from './empty-state';

const onPress = fn();

const content = {
  icon: 'sessions',
  title: 'Title',
  description: 'Description',
  action: <Button label="Action" onPress={onPress} />,
};

const meta = {
  title: 'Tests/Design System/Primitives/Status/EmptyState',
  component: EmptyState,
  args: content,
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentAndAction: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('heading', { name: content.title }),
    ).toBeVisible();
    await expect(canvas.getByText(content.description)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Action' }));
    await expect(onPress).toHaveBeenCalledOnce();
  },
};

export const NoAction: Story = {
  args: { action: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: content.title }),
    ).toBeVisible();
    await expect(canvas.getByText(content.description)).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const TitleOnly: Story = {
  args: { icon: undefined, description: undefined, action: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: content.title }),
    ).toBeVisible();
    await expect(canvas.queryByText(content.description)).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const Search: Story = {
  args: { icon: 'search', action: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: content.title }),
    ).toBeVisible();
    await expect(canvas.getByText(content.description)).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/*
 * Loading, empty and error are three shapes a reader tells apart without colour: a busy indicator named for its work,
 * a heading that says nothing is there, and a danger Callout that says what failed and offers a retry.
 */
export const LoadingEmptyAndErrorAreDistinct: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => (
    <View>
      <Spinner accessibilityLabel="Loading Issues" />
      <EmptyState title="No Issues" description="Nothing matches." />
      <Callout
        tone="danger"
        title="Couldn’t load Issues"
        description="The tracker did not answer."
        actions={<Button label="Try again" onPress={onPress} />}
      />
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('progressbar', { name: 'Loading Issues' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: 'No Issues' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: 'Couldn’t load Issues' }),
    ).toBeVisible();
    await expect(canvas.getAllByRole('progressbar')).toHaveLength(1);
    await expect(canvas.getAllByRole('heading')).toHaveLength(2);
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(onPress).toHaveBeenCalled();
  },
};
