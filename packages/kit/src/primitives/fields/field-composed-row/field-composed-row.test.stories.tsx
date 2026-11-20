import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fireEvent, fn, waitFor } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldComposedRow } from './field-composed-row';
import { livingRoom } from './field-composed-row-fixtures';
import { LightRow } from './field-composed-row.mocks';

const onPower = fn();

const onBrightness = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldComposedRow',
  component: FieldComposedRow,
  render: (): React.JSX.Element => (
    <FieldGroup>
      <FieldGroup.Section title="Section">
        {livingRoom.map((light) => (
          <LightRow
            key={light.id}
            light={light}
            onPower={onPower}
            onBrightness={onBrightness}
          />
        ))}
      </FieldGroup.Section>
    </FieldGroup>
  ),
  beforeEach: (): void => {
    onPower.mockClear();
    onBrightness.mockClear();
  },
} satisfies Meta<typeof FieldComposedRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SwitchFlips: Story = {
  play: async ({ canvas, userEvent }) => {
    const power = canvas.getByRole('switch', { name: 'Desk lamp' });
    await expect(power).toBeChecked();
    await userEvent.click(power);
    await expect(onPower).toHaveBeenCalledWith(false);
    await waitFor(() => expect(power).not.toBeChecked());
  },
};

export const SliderMoves: Story = {
  play: async ({ canvas }) => {
    const slider = canvas.getByRole('slider', { name: 'Desk lamp brightness' });
    await fireEvent.change(slider, { target: { value: '35' } });
    await waitFor(() => expect(onBrightness).toHaveBeenCalledWith(35));
    await expect(canvas.getByText('35%')).toBeVisible();
  },
};

export const SwitchedOffLightHasNoSlider: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('switch', { name: 'Floor lamp' }),
    ).not.toBeChecked();
    await expect(
      canvas.queryByRole('slider', { name: 'Floor lamp brightness' }),
    ).toBeNull();
  },
};
