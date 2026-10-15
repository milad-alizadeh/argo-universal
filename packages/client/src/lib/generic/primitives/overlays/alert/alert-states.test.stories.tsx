import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/buttons/button';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Alert } from './alert';

const onUpdate = fn();

// The Agent has running Sessions, so Update is listed but cannot run.
function UpdateAgent(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button label="Update Agent" onPress={() => setOpen(true)} />
      <Alert
        open={open}
        onOpenChange={setOpen}
        title="Update Example ACP?"
        actions={[
          { label: 'Cancel', cancel: true },
          { label: 'Update', disabled: true, onPress: onUpdate },
        ]}
      />
    </>
  );
}

// Remove keeps the alert up while it runs.
function RemoveAgent(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  return (
    <>
      <Button label="Remove Agent" onPress={() => setOpen(true)} />
      <Alert
        open={open || removing}
        onOpenChange={setOpen}
        title="Remove Example ACP?"
        actions={[
          {
            label: 'Remove',
            tone: 'danger',
            loading: removing,
            onPress: () => setRemoving(true),
          },
          { label: 'Cancel', cancel: true },
        ]}
      />
    </>
  );
}

const meta = {
  title: 'Tests/Alert/States',
  beforeEach: async (): Promise<void> => {
    onUpdate.mockClear();
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

// A disabled answer is announced as disabled and takes no focus; the others still answer.
export const DisabledAnswer: Story = {
  render: () => <UpdateAgent />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Update Agent' }));

    const alert = await body.findByRole('dialog', {
      name: 'Update Example ACP?',
    });

    const update = within(alert).getByRole('button', { name: 'Update' });

    await expect(update).toBeDisabled();
    await userEvent.tab();
    await userEvent.tab();
    await expect(update).not.toHaveFocus();
    await expect(onUpdate).not.toHaveBeenCalled();
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Cancel' }),
    );
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};

// A running answer is busy, every answer waits, and Escape leaves the alert up while the work runs.
export const RunningAnswer: Story = {
  render: () => <RemoveAgent />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Agent' }));

    const alert = await body.findByRole('dialog', {
      name: 'Remove Example ACP?',
    });

    await userEvent.click(
      within(alert).getByRole('button', { name: 'Remove' }),
    );

    const remove = within(alert).getByRole('button', { name: 'Remove' });

    await expect(remove).toHaveAttribute('aria-busy', 'true');
    await expect(remove).toBeDisabled();
    await expect(
      within(alert).getByRole('button', { name: 'Cancel' }),
    ).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(alert).toBeInTheDocument();
  },
};
