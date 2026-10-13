import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  readyAgent,
  signInCommand,
} from './agent-detail.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agent',
  component: AgentDetailView,
  args: agentDetailArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

const removeLabel = `Remove ${readyAgent.name}`;

export const ShowsTheVersionAndDistribution: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: readyAgent.name, level: 1 }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: `Version, v${readyAgent.version}` }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Distribution, npm · needs Node.js' }),
    ).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'GitHub' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Licence' })).toBeVisible();
    await expect(canvas.getByText('Ready')).toBeVisible();
  },
};

export const LabelsTheNewSessionsDefaultsAsThisDevices: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'New Sessions' }),
    ).toBeVisible();
    await expect(canvas.getByText(/on this Device\.$/)).toBeVisible();
  },
};

export const InstallsARegistryAgent: Story = {
  args: { agent: { ...readyAgent, status: 'not-installed' } },
  play: async ({ args, canvas, userEvent }) => {
    await expect(
      canvas.getByRole('group', { name: 'Source, ACP Registry' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: 'Status' }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Install' }));
    await expect(args.onInstall).toHaveBeenCalledOnce();
    await expect(
      canvas.queryByRole('button', { name: removeLabel }),
    ).not.toBeInTheDocument();
  },
};

export const UpdatesTheAgentOnAPhone: Story = {
  args: { agent: { ...readyAgent, status: 'update' } },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Update' }));
    await expect(args.onUpdate).toHaveBeenCalledOnce();
  },
};

export const OpensOnTheAgentsIdentityCard: Story = {
  args: { agent: { ...readyAgent, status: 'update' } },
  play: async ({ canvas }) => {
    const card = canvas.getByRole('group', {
      name: new RegExp(`^${readyAgent.description}`),
    });
    await expect(within(card).getByText('Update available')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Update' })).toBeVisible();
  },
};

export const SignsInAndChecksAgain: Story = {
  args: { agent: { ...readyAgent, status: 'sign-in', signInCommand } },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('Sign-in needed')).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: signInCommand }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Copy command' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('heading', { name: 'New Sessions' }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('link', { name: 'Check again' }));
    await expect(args.onCheckAgain).toHaveBeenCalledOnce();
  },
};

export const DisablesActionsTheServerCannotDoYet: Story = {
  args: { onRemove: undefined, onInstall: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: removeLabel }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};

export const GoesBack: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
};

export const ShowsThePlainPickers: Story = {
  play: async ({ canvas }) => {
    for (const name of ['Model', 'Effort', 'Mode']) {
      const row = canvas.getByRole('group', { name });
      await expect(within(row).getByLabelText(name)).toBeVisible();
    }
  },
};
