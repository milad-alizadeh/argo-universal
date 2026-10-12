import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { AgentInstallSheet } from './agent-install-sheet';
const meta = {
  title: 'Agents/AgentInstallSheet',
  component: AgentInstallSheet,
  args: {
    name: 'Claude',
    version: '0.88.0',
    distribution: 'npm',
    open: true,
    phase: 'confirm',
    onOpenChange: fn(),
    onInstall: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof AgentInstallSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Confirm: Story = {};
export const Installing: Story = { args: { phase: 'installing' } };
export const Installed: Story = { args: { phase: 'installed' } };
