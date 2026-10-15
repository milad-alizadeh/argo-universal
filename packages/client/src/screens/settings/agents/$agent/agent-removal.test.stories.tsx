import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, within, fn, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { AgentDetailView } from './agent-detail-view';
import { agentDetailArgs, readyAgent } from './agent-detail.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agent removal',
  component: AgentDetailView,
  args: agentDetailArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

const removeLabel = `Remove ${readyAgent.name}`;

const removal = (width: number): Story => ({
  beforeEach: (): Promise<void> => settleViewport(width),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', {
        name: new RegExp(`^${removeLabel}( Agent)?$`),
      }),
    );
    await expect(args.onRemove).not.toHaveBeenCalled();

    const confirmation = within(
      await within(document.body).findByRole('dialog', {
        name: `Remove ${readyAgent.name}?`,
      }),
    );

    await userEvent.click(confirmation.getByRole('button', { name: 'Remove' }));
    await expect(args.onRemove).toHaveBeenCalledOnce();
  },
});

export const RemovesTheAgent = removal(layoutWidths.wide);

export const RemovesTheAgentOnAPhone = removal(layoutWidths.phone);

export const CancelLeavesTheAgentInstalled: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: removeLabel }));

    const confirmation = within(
      await within(document.body).findByRole('dialog', {
        name: `Remove ${readyAgent.name}?`,
      }),
    );

    await userEvent.click(confirmation.getByRole('button', { name: 'Cancel' }));
    await expect(args.onRemove).not.toHaveBeenCalled();
    await expect(
      within(document.body).queryByRole('dialog'),
    ).not.toBeInTheDocument();
  },
};

export const ChangesEnablement: Story = {
  args: {
    management: {
      enabled: true,
      busy: false,
      onEnabledChange: fn(),
      onRemove: fn(),
      onDismissFailure: fn(),
    },
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('switch', { name: 'Agent enabled' }),
    );
    await expect(args.management?.onEnabledChange).toHaveBeenCalledWith(false);
  },
};

export const ExplainsInUseWithoutAForceAction: Story = {
  args: {
    management: {
      enabled: true,
      busy: false,
      onEnabledChange: fn(),
      onRemove: fn(),
      onDismissFailure: fn(),
      failure: 'Agent is in use. Close its Sessions and finish setup first.',
    },
  },
  play: async () => {
    const dialog = within(
      await within(document.body).findByRole('dialog', {
        name: 'Agent is in use',
      }),
    );

    await waitFor(() =>
      expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible(),
    );
    await expect(
      dialog.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
  },
};
