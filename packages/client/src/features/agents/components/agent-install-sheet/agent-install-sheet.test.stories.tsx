import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { AgentInstallSheet } from './agent-install-sheet';
const meta = {
  title: 'Tests/Agents/AgentInstallSheet',
  component: AgentInstallSheet,
  args: {
    name: 'Claude',
    version: '0.88.0',
    distribution: 'npm',
    phase: 'confirm',
    open: true,
    onInstall: fn(),
    onCancel: fn(),
    onOpenChange: fn(),
  },
} satisfies Meta<typeof AgentInstallSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Install: Story = {
  play: async ({ userEvent, args }) => {
    const dialog = within(
      await within(document.body).findByRole('dialog', {
        name: 'Install Claude?',
      }),
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Install' }));
    await expect(args.onInstall).toHaveBeenCalledOnce();
  },
};
export const Installing: Story = {
  args: { phase: 'installing' },
  play: async ({ userEvent, args }) => {
    const dialog = within(
      await within(document.body).findByRole('dialog', {
        name: 'Install Claude?',
      }),
    );
    await expect(
      dialog.getByRole('button', { name: 'Install' }),
    ).toBeDisabled();
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
  },
};
