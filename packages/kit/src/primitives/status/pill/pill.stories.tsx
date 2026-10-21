import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Variation, Variations } from '../../../variations';
import { Pill } from './pill';

const tones = [
  'neutral',
  'muted',
  'accent',
  'info',
  'success',
  'warning',
  'danger',
  'done',
] as const;

const meta = {
  title: 'Design System/Primitives/Status/Pill',
  args: { text: 'Ready' },
  component: Pill,
  argTypes: kitArgTypes('Pill'),
} satisfies Meta<typeof Pill>;

export default meta;

export const Overview: StoryObj<typeof meta> = {
  name: 'Pill',
  render: () => (
    <Variations>
      {tones.map((tone) => (
        <Variation key={tone} label={`tone ${tone}`}>
          <Pill text="Ready" tone={tone} />
        </Variation>
      ))}
    </Variations>
  ),
};
