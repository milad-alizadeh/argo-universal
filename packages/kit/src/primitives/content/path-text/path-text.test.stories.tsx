import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, within } from 'storybook/test';
import { layoutWidths, settleLayout } from '#mocks/story-layout';
import { PathText } from './path-text';
import { longPath, shortPath } from './path-text-fixtures';

const meta = {
  title: 'Tests/Design System/Primitives/Content/PathText',
  component: PathText,
  decorators: [
    (Story): ReactElement => (
      <View style={{ width: 240 }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof PathText>;

export default meta;

type Story = StoryObj<typeof meta>;

const settleTooltipDelay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 1000));

export const CutPathShowsWholePathInTooltip: Story = {
  args: longPath,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.hover(canvas.getByLabelText(longPath.path));
    await expect(
      await within(document.body).findByRole('tooltip'),
    ).toHaveTextContent(longPath.path);
  },
};

export const UncutPathShowsNoTooltip: Story = {
  args: shortPath,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.hover(canvas.getByLabelText(shortPath.path));
    await settleTooltipDelay();
    await expect(
      within(document.body).queryByRole('tooltip'),
    ).not.toBeInTheDocument();
  },
};

export const CutPathKeepsNameWhole: Story = {
  args: longPath,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const line = canvas.getByLabelText(longPath.path);
    const name = within(line).getByText('useWide.ts');
    await expect(name.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      line.getBoundingClientRect().left - 1,
    );
    await expect(name.getBoundingClientRect().right).toBeLessThanOrEqual(
      line.getBoundingClientRect().right + 1,
    );
  },
};
