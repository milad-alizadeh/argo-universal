import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import presentationMeta, { Overview } from './label.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/label',
};

export default meta;

export const Contents: StoryObj<typeof meta> = {
  ...Overview,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('3 Subagents')).toBeVisible();
    await expect(canvas.getByText('2/5 jobs')).toBeVisible();
    await expect(canvas.getByTestId('icon-pr-open')).toBeVisible();
  },
};
