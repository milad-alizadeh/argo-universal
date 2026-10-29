import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Pill } from './pill';
import {
  controlPill,
  countedControlPill,
  selectedControlPill,
  disabledControlPill,
  accentPill,
  dangerPill,
  donePill,
  infoPill,
  labelPills,
  mutedPill,
  neutralPill,
  successPill,
  warningPill,
} from './pill-fixtures';

const meta = {
  title: 'Design System/Primitives/Status/Pill',
  component: Pill,
  argTypes: kitArgTypes('Pill'),
} satisfies Meta<typeof Pill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: neutralPill };

export const Muted: Story = { args: mutedPill };

export const Accent: Story = { args: accentPill };

export const Info: Story = { args: infoPill };

export const Success: Story = { args: successPill };

export const Warning: Story = { args: warningPill };

export const Danger: Story = { args: dangerPill };

export const Done: Story = { args: donePill };

// A tracker label's own colour: its text in that colour, made readable for the theme, over a light fill of it.
export const Labels: Story = {
  args: labelPills[0],
  render: () => (
    <View className="flex-row flex-wrap gap-2">
      {labelPills.map((label) => (
        <Pill key={label.text} {...label} />
      ))}
    </View>
  ),
};

export const Control: Story = { args: controlPill };

export const CountedControl: Story = { args: countedControlPill };

export const SelectedControl: Story = { args: selectedControlPill };

export const DisabledControl: Story = { args: disabledControlPill };
