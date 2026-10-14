import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  registryAgent,
  toolArgs,
} from './agent-detail.mocks';

// A registry Agent whose distribution needs a tool the Server lacks: Install waits for the tool.
const meta = {
  title: 'Screens/Settings/Agent missing tool',
  component: AgentDetailView,
  args: agentDetailArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

const needsNode = { ...registryAgent, status: 'needs-node' } as const;

export const NeedsNodeJs: Story = {
  args: {
    agent: needsNode,
    installation: installationArgs(),
    tool: toolArgs(),
  },
};
export const NeedsUvWithoutHomebrew: Story = {
  args: {
    agent: {
      ...registryAgent,
      status: 'needs-uv',
      distribution: 'Python · needs uv',
    },
    installation: installationArgs(),
    tool: toolArgs({ homebrew: false }),
  },
};
export const ConfirmingNodeJsInstall: Story = {
  args: {
    agent: needsNode,
    tool: toolArgs({ confirming: true }),
  },
};
export const InstallingNodeJs: Story = {
  args: {
    agent: needsNode,
    tool: toolArgs({ installing: true }),
  },
};
