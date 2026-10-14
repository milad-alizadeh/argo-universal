import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Alert } from './alert';

type RemovalProps = {
  onRemove: () => void;
  onOpenChange: (open: boolean) => void;
  // Remove is not allowed yet, such as while the Agent is still in use.
  blocked?: boolean;
  // Remove is running; the alert stays up until it finishes.
  removing?: boolean;
};

function Removal(props: RemovalProps): React.JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <Alert
      open={open || !!props.removing}
      onOpenChange={(next) => {
        setOpen(next);
        props.onOpenChange(next);
      }}
      title="Remove Example ACP?"
      message="Sessions that use it keep their history."
      actions={[
        { label: 'Cancel', cancel: true },
        {
          label: props.removing ? 'Removing…' : 'Remove',
          tone: 'danger',
          disabled: props.blocked,
          loading: props.removing,
          onPress: props.onRemove,
        },
      ]}
    />
  );
}

const meta = {
  title: 'Tests/Alert/States',
  component: Removal,
  args: { onRemove: fn(), onOpenChange: fn() },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof Removal>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

const alertName = { name: 'Remove Example ACP?' };

// A disabled answer cannot run; Cancel still closes the alert.
export const DisabledAnswer: Story = {
  args: { blocked: true },
  play: async ({ userEvent, args }) => {
    const alert = await body.findByRole('dialog', alertName);
    await expect(
      within(alert).getByRole('button', { name: 'Remove' }),
    ).toBeDisabled();
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Cancel' }),
    );
    await waitFor(() =>
      expect(body.queryByRole('dialog', alertName)).toBeNull(),
    );
    await expect(args.onRemove).not.toHaveBeenCalled();
  },
};

// While its answer runs, the alert shows progress, takes no second answer and cannot be dismissed.
export const LoadingAnswer: Story = {
  args: { removing: true },
  play: async ({ userEvent, args }) => {
    const alert = await body.findByRole('dialog', alertName);
    await waitFor(() =>
      expect(
        within(alert).getByRole('progressbar', { name: 'Removing…' }),
      ).toBeVisible(),
    );
    await expect(
      within(alert).getByRole('button', { name: 'Removing…' }),
    ).toBeDisabled();
    await expect(
      within(alert).getByRole('button', { name: 'Cancel' }),
    ).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(body.getByRole('dialog', alertName)).toBeInTheDocument();
    await expect(args.onOpenChange).not.toHaveBeenCalled();
    await expect(args.onRemove).not.toHaveBeenCalled();
  },
};
