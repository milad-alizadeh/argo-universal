import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import presentationMeta, { Overview } from './pill.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/pill',
};

export default meta;

export const Contents: StoryObj<typeof meta> = {
  ...Overview,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Archived')).toBeVisible();
    await expect(canvas.getByText('Production')).toBeVisible();
  },
};
