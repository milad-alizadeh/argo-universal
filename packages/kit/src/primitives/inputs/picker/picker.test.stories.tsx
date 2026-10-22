import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import { ListSection } from '#primitives/lists/list';
import { settleViewport } from '../../../settle-viewport';
import { Picker } from './picker';

const options = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

type Effort = (typeof options)[number]['value'];

const changed = fn<(value: Effort) => void>();

function EffortPicker(): React.JSX.Element {
  const [value, setValue] = useState<Effort>();

  return (
    <Picker
      label="Effort"
      value={value}
      options={options}
      onValueChange={(next) => {
        setValue(next);
        changed(next);
      }}
    />
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Inputs/Picker',
  render: (): React.JSX.Element => <EffortPicker />,
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
    changed.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PointerSelection: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Effort' }));
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('option', { name: 'High' }));
    await expect(changed).toHaveBeenCalledTimes(1);
    await expect(changed).toHaveBeenCalledWith('high');
    await expect(
      canvas.getByRole('button', { name: 'Effort' }),
    ).toHaveTextContent('High');
  },
};

export const KeyboardTypeahead: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Effort' });

    trigger.focus();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await within(canvasElement.ownerDocument.body).findByRole('listbox');
    await userEvent.keyboard('high{Enter}');
    await expect(changed).toHaveBeenCalledTimes(1);
    await expect(changed).toHaveBeenCalledWith('high');
  },
};

export const InvalidAnnouncement: Story = {
  render: () => (
    <ListSection footer="Choose an effort" tone="danger">
      <Picker
        label="Effort"
        options={options}
        errors={[{ message: 'Choose an effort' }]}
        onValueChange={changed}
      />
    </ListSection>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Effort' });
    await expect(trigger).toHaveAttribute('aria-invalid', 'true');
    await expect(trigger).toHaveAccessibleDescription('Choose an effort');
    await expect(canvas.getAllByRole('alert')).toHaveLength(1);
  },
};

export const Disabled: Story = {
  render: () => (
    <Picker
      label="Effort"
      options={options}
      value="medium"
      disabled
      onValueChange={changed}
    />
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Effort' });

    await expect(trigger).toBeDisabled();
    trigger.focus();
    await expect(trigger).not.toHaveFocus();
    await expect(changed).not.toHaveBeenCalled();
  },
};

export const ArrowSelection: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Effort' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    const page = within(document.body);
    await expect(
      await page.findByRole('option', { name: 'Low' }),
    ).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(page.getByRole('option', { name: 'Medium' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(changed).toHaveBeenCalledWith('medium');
    await expect(trigger).toHaveFocus();
  },
};

export const EscapeKeepsValue: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Effort' });
    await userEvent.click(trigger);
    const page = within(document.body);
    await page.findByRole('listbox');
    await userEvent.keyboard('{ArrowDown}{Escape}');
    await expect(page.queryByRole('listbox')).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
    await expect(changed).not.toHaveBeenCalled();
    await expect(trigger).toHaveTextContent('Choose…');
  },
};
