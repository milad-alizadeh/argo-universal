import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  readyAgent,
  serverName,
  toolArgs,
} from './agent-detail.mocks';

const { name } = readyAgent;

// uv is missing and Homebrew isn't on the Server: Argo links the downloads and installs nothing itself.
const meta = {
  title: 'Tests/Screens/Settings/Agent tool download',
  component: AgentDetailView,
  args: {
    ...agentDetailArgs(),
    agent: { ...readyAgent, status: 'needs-uv' },
    installation: installationArgs(),
    tool: toolArgs({ homebrew: false }),
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = keyof typeof layoutWidths;

const linksTheDownloads = (layout: Layout): Story => ({
  beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Needs uv')[0]).toBeVisible();
    await expect(canvas.getByText('uv not found')).toBeVisible();
    await expect(
      canvas.getByRole('link', { name: 'Download uv' }),
    ).toHaveAttribute(
      'href',
      'https://docs.astral.sh/uv/getting-started/installation/',
    );
    await expect(
      canvas.getByRole('link', { name: 'Get Homebrew' }),
    ).toHaveAttribute('href', 'https://brew.sh');
    await expect(
      canvas.getByText(
        `${name} runs with uvx. Homebrew isn’t on ${serverName}, so install uv from astral.sh, then Recheck.`,
      ),
    ).toBeVisible();
    await expect(canvas.queryByText(/with Homebrew$/)).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Install' }),
    ).not.toBeInTheDocument();
  },
});

export const LinksTheDownloadsOnDesktop = linksTheDownloads('wide');

export const LinksTheDownloadsOnPhone = linksTheDownloads('phone');

export const RecheckLooksForTheToolsAgain: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Recheck' }));
    await expect(args.tool?.onRecheck).toHaveBeenCalledOnce();
  },
};

export const RecheckWaitsInPlace: Story = {
  args: { tool: toolArgs({ homebrew: false, rechecking: true }) },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Recheck' }),
    ).toBeDisabled();
  },
};
