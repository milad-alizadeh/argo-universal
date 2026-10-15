import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/buttons/button';
import { Sheet } from '#primitives/overlays/sheet';
import { settleViewport } from '../../../settle-viewport';
import { PickerSheet } from './picker-sheet';

const changed = fn<(value: string) => void>();

const blurred = fn<() => void>();

const choices = [
  'Apple',
  'Banana',
  'Cherry',
  'Date',
  'Fig',
  'Grape',
  'Kiwi',
  'Lime',
].map((label) => ({ label, value: label }));

function Choice(): React.JSX.Element {
  const [value, setValue] = useState('Apple');

  return (
    <PickerSheet
      label="Fruit"
      value={value}
      options={choices}
      onValueChange={(next) => {
        setValue(next);
        changed(next);
      }}
      onBlur={blurred}
      trigger={<Button label={`Fruit: ${value}`} />}
    />
  );
}

function Form(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      label="Settings"
      trigger={<Button custom label="Settings" />}
    >
      <Sheet.Page name="settings" title="Settings">
        <Choice />
      </Sheet.Page>
    </Sheet>
  );
}

const meta = {
  title: 'Tests/PickerSheet',
  beforeEach: async (): Promise<void> => {
    await settleViewport(390);
    changed.mockClear();
    blurred.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const BackAndReopen: Story = {
  render: () => <Form />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    await userEvent.click(
      await page.findByRole('button', { name: 'Fruit: Apple' }),
    );
    await userEvent.click(
      await page.findByRole('button', { name: 'Back to Settings' }),
    );
    await expect(changed).not.toHaveBeenCalled();
    await expect(blurred).toHaveBeenCalledTimes(1);
    await userEvent.click(
      await page.findByRole('button', { name: 'Fruit: Apple' }),
    );
    await userEvent.click(await page.findByRole('radio', { name: 'Cherry' }));
    await expect(
      await page.findByRole('button', { name: 'Fruit: Cherry' }),
    ).toBeVisible();
    await expect(changed).toHaveBeenCalledTimes(1);
    await expect(changed).toHaveBeenCalledWith('Cherry');
    await expect(blurred).toHaveBeenCalledTimes(2);
    await userEvent.click(page.getByRole('button', { name: 'Fruit: Cherry' }));
    await waitFor(() =>
      expect(page.getByRole('radio', { name: 'Cherry' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );
    await userEvent.keyboard('{Escape}');
    await expect(blurred).toHaveBeenCalledTimes(3);
    await expect(changed).toHaveBeenCalledTimes(1);
  },
};
