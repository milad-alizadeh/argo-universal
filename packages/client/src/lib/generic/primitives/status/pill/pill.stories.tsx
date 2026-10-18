import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Variation, Variations } from '../../../variations';
import { Pill } from './pill';

const meta = {
  title: 'Design System/Primitives/Status/Pill',
  args: { text: 'Archived' },
  component: Pill,
} satisfies Meta<typeof Pill>;

export default meta;

export const Overview: StoryObj<typeof meta> = {
  name: 'Pill',
  render: () => (
    <Variations>
      <Variation label="Session">
        <Pill text="Archived" />
      </Variation>
      <Variation label="CI run">
        <Pill text="Production" tone="info" />
      </Variation>
    </Variations>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Archived')).toBeVisible();
    await expect(canvas.getByText('Production')).toBeVisible();
  },
};
