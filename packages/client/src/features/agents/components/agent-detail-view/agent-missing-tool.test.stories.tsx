import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { allToasts, findToast } from '../../../../../mocks/find-toast';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import type { AgentStatus } from '../../state/agent-status';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  readyAgent,
  serverName,
  toolArgs,
} from './agent-detail.mocks';

const { name } = readyAgent;

const needing = (status: AgentStatus): typeof readyAgent => ({
  ...readyAgent,
  status,
});

const meta = {
  title: 'Tests/Screens/Settings/Agent missing tool',
  component: AgentDetailView,
  args: {
    ...agentDetailArgs(),
    agent: needing('needs-node'),
    installation: installationArgs(),
    tool: toolArgs(),
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = keyof typeof layoutWidths;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const body = within(document.body);

const homebrewAction = 'Install Node.js with Homebrew';

async function expectNoInstall(canvas: Canvas): Promise<void> {
  await expect(
    canvas.queryByRole('button', { name: 'Install' }),
  ).not.toBeInTheDocument();
}

// Install is hidden while Node.js is missing; with Homebrew the one action installs it.
const needsNodeWithHomebrew = (layout: Layout): Story => ({
  beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Needs Node.js')[0]).toBeVisible();
    await expect(canvas.getByText('Node.js not found')).toBeVisible();
    await expect(canvas.getByText(homebrewAction)).toBeVisible();
    await expect(
      canvas.getByText(
        `${name} runs with npx. Argo asks before it runs brew install node on ${serverName}.`,
      ),
    ).toBeVisible();
    await expect(
      canvas.queryByText('Download Node.js'),
    ).not.toBeInTheDocument();
    await expectNoInstall(canvas);
  },
});

export const NeedsNodeOffersHomebrewOnDesktop = needsNodeWithHomebrew('wide');

export const NeedsNodeOffersHomebrewOnPhone = needsNodeWithHomebrew('phone');

export const InstallWithHomebrewAsksFirst: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText(homebrewAction));
    await expect(args.tool?.onConfirmingChange).toHaveBeenCalledWith(true);
    await expect(args.tool?.onInstall).not.toHaveBeenCalled();
  },
};

export const AlertShowsTheExactCommand: Story = {
  args: { tool: toolArgs({ confirming: true }) },
  play: async ({ args, userEvent }) => {
    const alert = await body.findByRole('dialog', { name: 'Install Node.js?' });
    await expect(
      within(alert).getByText(
        `${name} runs with npx, which needs Node.js. Argo runs this with Homebrew on ${serverName}:`,
      ),
    ).toBeVisible();
    await expect(within(alert).getByText('brew install node')).toBeVisible();
    await userEvent.click(
      within(alert).getByRole('button', { name: 'Install' }),
    );
    await expect(args.tool?.onInstall).toHaveBeenCalledOnce();
  },
};

export const ShowsHomebrewProgressInPlace: Story = {
  args: { tool: toolArgs({ installing: true }) },
  play: async ({ args, canvas, userEvent }) => {
    const progress = canvas.getByText('Installing Node.js…');
    await expect(progress).toBeVisible();
    await expect(canvas.queryByText(homebrewAction)).not.toBeInTheDocument();
    await userEvent.click(progress);
    await expect(args.tool?.onConfirmingChange).not.toHaveBeenCalled();
  },
};

// Without Homebrew the one action is the official download page; Argo installs nothing itself.
const needsUvWithoutHomebrew = (layout: Layout): Story => ({
  args: { agent: needing('needs-uv'), tool: toolArgs({ homebrew: false }) },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Needs uv')[0]).toBeVisible();
    await expect(canvas.getByText('uv not found')).toBeVisible();
    await expect(
      canvas.getByRole('link', { name: 'Download uv' }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        `${name} runs with uvx. Homebrew isn’t on ${serverName}, so install uv from astral.sh, then come back to this page.`,
      ),
    ).toBeVisible();
    await expect(canvas.queryByText(/with Homebrew$/)).not.toBeInTheDocument();
    await expectNoInstall(canvas);
  },
});

export const NeedsUvLinksTheDownloadOnDesktop = needsUvWithoutHomebrew('wide');

export const NeedsUvLinksTheDownloadOnPhone = needsUvWithoutHomebrew('phone');

export const ToastsTheInstalledTool: Story = {
  args: {
    tool: toolArgs({
      notice: { key: 'brew', tool: 'node', result: 'installed' },
    }),
  },
  play: async () => {
    await expect(await findToast('Node.js installed')).toBeVisible();
    await expect(await findToast(`You can install ${name} now.`)).toBeVisible();
    await waitFor(async () =>
      expect(await allToasts('Node.js installed')).toHaveLength(1),
    );
  },
};

export const ToastsTheHomebrewFailure: Story = {
  args: {
    tool: toolArgs({
      notice: {
        key: 'brew',
        tool: 'node',
        result: 'failed',
        failure: 'brew failed to install Node.js: no bottle',
      },
    }),
  },
  play: async ({ canvas }) => {
    await findToast('Could not install Node.js');
    await expect(
      await findToast('brew failed to install Node.js: no bottle'),
    ).toBeVisible();
    await expect(canvas.getByText(homebrewAction)).toBeVisible();
  },
};
