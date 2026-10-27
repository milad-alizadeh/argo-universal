import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import feedMeta from './composer-status.stories';

const meta = { ...feedMeta, title: 'Tests/Composer/ComposerStatus' };

export default meta;

type Story = StoryObj<typeof meta>;

// A count of one names the thing, not its plural: "1 Shell", while two Agents stay "Agents".
export const CountAgreesWithItsNoun: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Agents')).toBeVisible();
    await expect(canvas.getByText('Shell')).toBeVisible();
    await expect(canvas.queryByText('Shells')).toBeNull();
  },
};
