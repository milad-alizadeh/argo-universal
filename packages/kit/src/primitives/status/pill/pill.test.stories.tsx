import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
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

const trackerColor = ['#', '82', '50', 'df'].join('');

const meta = {
  title: 'Tests/Design System/Primitives/Status/Pill',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsEveryTone: Story = {
  render: () => (
    <View className="flex-row flex-wrap gap-2">
      {tones.map((tone) => (
        <Pill key={tone} text={tone} tone={tone} />
      ))}
    </View>
  ),
  play: async ({ canvas }) => {
    for (const tone of tones)
      await expect(canvas.getByText(tone)).toBeVisible();
  },
};

export const ShowsCustomColor: Story = {
  render: () => <Pill color={trackerColor} text="good first issue" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('good first issue')).toBeVisible();
  },
};

function TogglePill(): ReactElement {
  const [selected, setSelected] = useState(false);

  return (
    <Pill
      variant="control"
      text="Toggle choice"
      selected={selected}
      onPress={() => setSelected(!selected)}
    />
  );
}

export const KeyboardActivatesTheControl: Story = {
  render: (): ReactElement => <TogglePill />,
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Toggle choice' });
    button.focus();
    await userEvent.keyboard(' ');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  },
};

const disabledPress = fn();

export const DisabledControlCannotActivate: Story = {
  render: (): ReactElement => (
    <Pill
      variant="control"
      text="Unavailable choice"
      disabled
      onPress={disabledPress}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Unavailable choice' });
    button.focus();
    await userEvent.keyboard('{Enter} ');
    await expect(disabledPress).not.toHaveBeenCalled();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
  },
};
