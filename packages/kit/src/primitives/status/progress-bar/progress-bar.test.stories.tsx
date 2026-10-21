import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import presentationMeta, { Overview } from './progress-bar.stories';

const valueAttribute = 'aria-valuenow';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/progress-bar',
};

export default meta;

export const Contents: StoryObj<typeof meta> = {
  ...Overview,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('progressbar', { name: 'Plan' }),
    ).toHaveAttribute(valueAttribute, '40');
    await expect(
      canvas.getByRole('progressbar', { name: 'Jobs' }),
    ).toHaveAttribute(valueAttribute, '75');
    await expect(
      canvas.getByRole('progressbar', { name: 'Queued' }),
    ).toHaveAttribute(valueAttribute, '0');
    await expect(
      canvas.getByRole('progressbar', { name: 'Complete' }),
    ).toHaveAttribute(valueAttribute, '100');
  },
};
