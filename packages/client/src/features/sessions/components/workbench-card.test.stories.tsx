import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { WorkbenchCard } from './workbench-card';

const meta = {
  title: 'Tests/WorkbenchCard',
  component: WorkbenchCard,
  decorators: [
    (Story): ReactElement => (
      <View className="m-8 w-frame-list">
        <Story />
      </View>
    ),
  ],
  args: {
    title: 'Changes',
    icon: 'diff',
    testID: 'card',
    collapsible: true,
    summary: <Text>3 files</Text>,
    onOpen: fn(),
    children: <Text>Working branch</Text>,
  },
} satisfies Meta<typeof WorkbenchCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WholeHeaderTogglesAndBodyOpensStage: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const header = canvas.getByRole('button', { name: 'Collapse Changes' });
    await expect(header).toContainElement(
      canvas.getByRole('heading', { name: 'Changes' }),
    );
    await userEvent.click(canvas.getByText('Changes'));
    await expect(canvas.queryByText('Working branch')).toBeNull();
    await userEvent.click(canvas.getByText('3 files'));
    await expect(canvas.getByText('Working branch')).toBeVisible();
    header.focus();
    await userEvent.keyboard(' ');
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{Enter}');
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onOpen).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Changes overview' }),
    );
    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
};
