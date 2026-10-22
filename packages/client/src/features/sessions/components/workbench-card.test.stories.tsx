import { sampleEachFrame } from '@repo/kit/mocks/sample-each-frame';
import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { WorkbenchCard } from './workbench-card';

const meta = {
  title: 'Tests/Sessions/WorkbenchCard',
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
    await waitFor(() =>
      expect(canvas.queryByText('Working branch')).toBeNull(),
    );
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

async function assertHeightMotion(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
  action: string,
): Promise<void> {
  const card = canvas.getByTestId('card');

  const height = (): number => card.getBoundingClientRect().height;
  const start = height();

  const frames = await sampleEachFrame(
    () => canvas.getByRole('button', { name: action }).click(),
    height,
    24,
  );

  await expect(frames.at(-1)).not.toBe(start);
  await expect(new Set(frames.map(Math.round)).size).toBeGreaterThan(2);
}

export const CardHeightAnimatesInBothDirections: Story = {
  play: async ({ canvas }) => {
    await assertHeightMotion(canvas, 'Collapse Changes');
    await assertHeightMotion(canvas, 'Expand Changes');
  },
};
