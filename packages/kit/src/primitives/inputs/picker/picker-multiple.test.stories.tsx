import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import { Picker } from './picker';

const labels = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'docs', label: 'Docs' },
  { value: 'chore', label: 'Chore', disabled: true },
] as const;

type Label = (typeof labels)[number]['value'];

const picked = fn<(value: Label[]) => void>();

function LabelsPicker(props: {
  initial?: Label[];
  disabled?: boolean;
}): React.JSX.Element {
  const [value, setValue] = useState(props.initial);

  return (
    <Picker
      multiple
      label="Labels"
      placeholder="Choose labels"
      value={value}
      options={labels}
      disabled={props.disabled}
      onValueChange={(next) => {
        setValue(next);
        picked(next);
      }}
    />
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Inputs/Picker/Multiple',
  render: (): React.JSX.Element => <LabelsPicker />,
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
    picked.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TogglesStayOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Labels' });
    await expect(trigger).toHaveTextContent('Choose labels');
    await userEvent.click(trigger);
    const page = within(document.body);
    await userEvent.click(await page.findByRole('option', { name: 'Bug' }));
    await expect(picked).toHaveBeenLastCalledWith(['bug']);
    await expect(trigger).toHaveTextContent('Bug');
    await userEvent.click(page.getByRole('option', { name: 'Docs' }));
    await expect(picked).toHaveBeenLastCalledWith(['bug', 'docs']);
    await expect(trigger).toHaveTextContent('2 selected');
    await expect(page.getByRole('option', { name: 'Docs' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(page.getByRole('option', { name: 'Bug' }));
    await expect(picked).toHaveBeenLastCalledWith(['docs']);
  },
};

export const SkipsDisabledOption: Story = {
  render: () => <LabelsPicker initial={['bug']} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Labels' }));
    const page = within(document.body);
    const chore = await page.findByRole('option', { name: 'Chore' });
    await expect(chore).toHaveAttribute('aria-disabled', 'true');
    chore.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Enter}');
    await expect(picked).not.toHaveBeenCalled();
    await expect(chore).toHaveAttribute('aria-selected', 'false');
  },
};

export const Keyboard: Story = {
  render: () => <LabelsPicker initial={['bug', 'feature', 'docs']} />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Labels' });
    await expect(trigger).toHaveTextContent('3 selected');
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const page = within(document.body);
    const feature = await page.findByRole('option', { name: 'Feature' });
    feature.focus();
    await userEvent.keyboard(' ');
    await expect(picked).toHaveBeenLastCalledWith(['bug', 'docs']);
    await userEvent.keyboard('{ArrowDown}');
    await expect(page.getByRole('option', { name: 'Docs' })).toHaveFocus();
    // Chore, the last option, is disabled, so focus stays on Docs.
    await userEvent.keyboard('{ArrowDown}');
    await expect(page.getByRole('option', { name: 'Docs' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        page.queryByRole('option', { name: 'Feature' }),
      ).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveTextContent('2 selected');
  },
};

export const Disabled: Story = {
  render: () => <LabelsPicker initial={['bug']} disabled />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Labels' });
    await expect(trigger).toBeDisabled();
    trigger.focus();
    await expect(trigger).not.toHaveFocus();
    await expect(picked).not.toHaveBeenCalled();
  },
};

export const Invalid: Story = {
  render: () => (
    <Picker
      multiple
      label="Labels"
      options={labels}
      invalid
      onValueChange={picked}
    />
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Labels' });
    await expect(trigger).toBeVisible();
  },
};
