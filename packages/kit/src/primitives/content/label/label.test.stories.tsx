import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import presentationMeta, {
  Count,
  Info,
  Success,
  TextOnly as TextOnlyLabel,
} from './label.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/Content/Label',
};

export default meta;

type Story = StoryObj<typeof meta>;

export const CountContents: Story = {
  ...Count,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('3 items')).toBeVisible();
  },
};

export const RatioContents: Story = {
  ...Info,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('2/5')).toBeVisible();
  },
};

export const IconContents: Story = {
  ...Success,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('icon-pr-open')).toBeVisible();
  },
};

export const TextOnly: Story = {
  ...TextOnlyLabel,
  play: async ({ canvas }) => {
    const label = canvas.getByTestId('label-text-only');

    await expect(within(label).getByText('v1.2.0')).toBeVisible();
    await expect(within(label).queryByTestId(/^icon-/)).toBeNull();
  },
};
