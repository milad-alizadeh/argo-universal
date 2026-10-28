import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { type LayoutName, settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Alert } from './alert';
import type { AlertAction } from './alert-props';

const onAnswer = fn();

const cancel: AlertAction = { label: 'Cancel', role: 'cancel' };

interface AskAgentProps {
  verb: 'Remove' | 'Update';
  actions: readonly AlertAction[];
  // Held open by the caller, as while an answer runs.
  held?: boolean;
}

// A button that asks to remove or update Example ACP.
function AskAgent(props: AskAgentProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button label={`${props.verb} Agent`} onPress={() => setOpen(true)} />
      <Alert
        open={open || props.held === true}
        onOpenChange={setOpen}
        title={`${props.verb} Example ACP?`}
        message="Sessions that use it keep their history."
        actions={props.actions}
      />
    </>
  );
}

const RemoveAgent = (): React.JSX.Element => (
  <AskAgent
    verb="Remove"
    actions={[{ label: 'Remove', tone: 'danger', onPress: onAnswer }, cancel]}
  />
);

// The Agent has running Sessions, so Update is listed but cannot run.
const UpdateAgent = (): React.JSX.Element => (
  <AskAgent
    verb="Update"
    actions={[cancel, { label: 'Update', disabled: true, onPress: onAnswer }]}
  />
);

// Remove keeps the alert up while it runs.
function RemovingAgent(): React.JSX.Element {
  const [removing, setRemoving] = useState(false);

  const remove: AlertAction = {
    label: 'Remove',
    tone: 'danger',
    loading: removing,
    onPress: () => setRemoving(true),
  };

  return <AskAgent verb="Remove" held={removing} actions={[remove, cancel]} />;
}

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Alert',
  render: (): React.JSX.Element => <RemoveAgent />,
  beforeEach: (): void => {
    onAnswer.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = LayoutName;

const body = within(document.body);

const alertName = { name: 'Remove Example ACP?' };

const trigger = { name: 'Remove Agent' };

// An alert is the same centred dialog at every width: it has no sheet and no close button.
function answers(layout: Layout, answer: string, removes: boolean): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(layout),
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
      await expect(onAnswer).toHaveBeenCalledTimes(removes ? 1 : 0);
    },
  };
}

export const RemovesOnPhone: Story = answers('phone', 'Remove', true);

export const CancelsOnPhone: Story = answers('phone', 'Cancel', false);

export const RemovesOnDesktop: Story = answers('wide', 'Remove', true);

export const ClosesOnEscape: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', trigger));
    await body.findByRole('dialog', alertName);
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(body.queryByRole('dialog', alertName)).toBeNull(),
    );
    await expect(onAnswer).not.toHaveBeenCalled();
  },
};

// A disabled answer is announced as disabled and takes no focus; the others still answer.
export const DisabledAnswer: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => <UpdateAgent />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Update Agent' }));

    const alert = await body.findByRole('dialog', {
      name: 'Update Example ACP?',
    });

    const update = within(alert).getByRole('button', { name: 'Update' });
    await expect(update).toBeDisabled();
    update.focus();
    await expect(update).not.toHaveFocus();
    await expect(onAnswer).not.toHaveBeenCalled();
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Cancel' }),
    );
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};

// A running answer disables every answer, and Escape leaves the alert up while the work runs.
export const RunningAnswer: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => <RemovingAgent />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', trigger));
    const alert = await body.findByRole('dialog', alertName);
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Remove' }),
    );
    const remove = within(alert).getByRole('button', { name: 'Remove' });

    await expect(remove).toBeDisabled();
    await expect(
      within(alert).getByRole('button', { name: 'Cancel' }),
    ).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(alert).toBeInTheDocument();
  },
};
