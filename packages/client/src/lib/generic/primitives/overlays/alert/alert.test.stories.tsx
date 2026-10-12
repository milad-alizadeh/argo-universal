import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Button } from '../../buttons/button/button';
import { Alert } from './alert';

const onRemove = fn();

function RemoveAgent(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button label="Remove Agent" onPress={() => setOpen(true)} />
      <Alert
        open={open}
        onOpenChange={setOpen}
        title="Remove Example ACP?"
        message="Sessions that use it keep their history."
        actions={[
          { label: 'Remove', role: 'destructive', onPress: onRemove },
          { label: 'Cancel', role: 'cancel' },
        ]}
      />
    </>
  );
}

const meta = {
  title: 'Tests/Alert',
  render: (): React.JSX.Element => <RemoveAgent />,
  beforeEach: (): void => {
    onRemove.mockClear();
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
type Layout = keyof typeof layoutWidths;

const body = within(document.body);
const alertName = { name: 'Remove Example ACP?' };
const trigger = { name: 'Remove Agent' };

// An alert is the same centred dialog at every width: it has no sheet and no close button.
function answers(layout: Layout, answer: string, removes: boolean): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', trigger));
      const alert = await body.findByRole('dialog', alertName);
      await expect(alert).toHaveAccessibleDescription(
        'Sessions that use it keep their history.',
      );
      await expect(
        within(alert).queryByRole('button', { name: 'Close' }),
      ).toBeNull();
      await userEvent.click(
        within(alert).getByRole('button', { name: answer }),
      );
      await waitFor(() =>
        expect(body.queryByRole('dialog', alertName)).toBeNull(),
      );
      await expect(onRemove).toHaveBeenCalledTimes(removes ? 1 : 0);
    },
  };
}

export const RemovesOnPhone: Story = answers('phone', 'Remove', true);
export const CancelsOnPhone: Story = answers('phone', 'Cancel', false);
export const RemovesOnDesktop: Story = answers('wide', 'Remove', true);

export const ClosesOnEscape: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', trigger));
    await body.findByRole('dialog', alertName);
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(body.queryByRole('dialog', alertName)).toBeNull(),
    );
    await expect(onRemove).not.toHaveBeenCalled();
  },
};
