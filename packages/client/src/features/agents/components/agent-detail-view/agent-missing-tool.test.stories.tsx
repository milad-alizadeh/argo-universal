import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  needingTool,
} from './agent-detail.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agent missing tool',
  component: AgentDetailView,
  args: {
    ...agentDetailArgs(),
    agent: needingTool('node'),
    installation: installationArgs(),
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = keyof typeof layoutWidths;

// Install waits for the tool; the Status row names it once, the footer says only what the Server observed, then Recheck, and Argo installs nothing itself.
const needsNode = (layout: Layout): Story => ({
  beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
  play: async ({ args, canvas, userEvent }) => {
    const status = canvas.getAllByText('Needs Node.js');
    await expect(status).toHaveLength(1);
    await expect(status[0]).toBeVisible();
    await expect(canvas.getByText('npx isn’t on this Mac.')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Install' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText(/Homebrew|Download/),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Recheck' }));
    await expect(args.onRecheck).toHaveBeenCalledOnce();
  },
});

export const NeedsNodeRechecksOnDesktop = needsNode('wide');

export const NeedsNodeRechecksOnPhone = needsNode('phone');

export const NeedsUvSaysUvxIsMissing: Story = {
  args: { agent: needingTool('uv') },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Needs uv')).toBeVisible();
    await expect(canvas.getByText('uvx isn’t on this Mac.')).toBeVisible();
  },
};
