import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { AgentAccessDetailView } from './agent-access-detail-view';

const installLabel = 'Add Argo to your Agents';

const meta = {
  title: 'Tests/Screens/Settings/AgentAccess',
  component: AgentAccessDetailView,
  parameters: { screenPreview: true },
  args: {
    access: { status: 'loaded', enabled: true },
    onEnabledChange: fn(),
    onInstall: fn(),
    onRetry: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof AgentAccessDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChangesAccessAndInstallsOnlyWhenPressed: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(args.onInstall).not.toHaveBeenCalled();
    await expect(
      canvas.getByText(
        'Install instructions for your Agents and a Codex rule in your home folder on the Server. Project files stay untouched.',
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole('switch', { name: 'Agent access to Argo' }),
    ).toBeChecked();
    await userEvent.click(
      canvas.getByRole('switch', { name: 'Agent access to Argo' }),
    );
    await expect(args.onEnabledChange).toHaveBeenCalledWith(false);
    await expect(args.onInstall).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: installLabel }));
    await expect(args.onInstall).toHaveBeenCalledOnce();
  },
};

export const StartsWithoutAccess: Story = {
  args: { access: { status: 'loaded', enabled: false } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('switch')).not.toBeChecked();
    await userEvent.click(canvas.getByRole('switch'));
    await expect(args.onEnabledChange).toHaveBeenCalledWith(true);
    await expect(args.onInstall).not.toHaveBeenCalled();
  },
};

export const WaitsForAnInstallation: Story = {
  args: { installing: true },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', {
      name: installLabel,
    });

    await expect(button).toBeDisabled();
    await expect(args.onInstall).not.toHaveBeenCalled();
  },
};

export const DisconnectedControlsStayInactive: Story = {
  args: { access: { status: 'disconnected' } },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('switch')).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: installLabel }),
    ).toBeDisabled();
    await expect(canvas.getByText(/Connect to the Server/)).toBeVisible();
    await expect(args.onInstall).not.toHaveBeenCalled();
  },
};

export const RetriesLoading: Story = {
  args: { access: { status: 'error' } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('switch')).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
    await expect(args.onInstall).not.toHaveBeenCalled();
  },
};

export const ReportsIncompleteInstallation: Story = {
  args: {
    error:
      'Could not add Argo instructions: 2 of 3 files updated. Run Add Argo to your Agents again to repair them.',
  },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText(/2 of 3 files updated/)).toBeVisible();
    await expect(
      canvas.queryByText(/instructions added to your Agents/),
    ).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: installLabel }));
    await expect(args.onInstall).toHaveBeenCalledOnce();
  },
};
