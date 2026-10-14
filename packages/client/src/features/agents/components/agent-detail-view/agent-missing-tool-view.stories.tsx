import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  needingTool,
} from './agent-detail.mocks';

// A registry Agent whose distribution needs a tool the Server lacks: Install waits until Recheck finds it.
const meta = {
  title: 'Screens/Settings/Agent missing tool',
  component: AgentDetailView,
  args: agentDetailArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NeedsNodeJs: Story = {
  args: { agent: needingTool('node'), installation: installationArgs() },
};

export const NeedsUv: Story = {
  args: { agent: needingTool('uv'), installation: installationArgs() },
};
