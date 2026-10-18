import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
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
};
