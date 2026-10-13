import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { allToasts, findToast } from '../../../../../mocks/find-toast';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  readyAgent,
  registryAgent,
} from './agent-detail.mocks';

const version = readyAgent.version;
if (!version) throw new Error('Agent fixture needs a version');
const meta = {
  title: 'Tests/Screens/Settings/Agent installation notices',
  component: AgentDetailView,
  args: { ...agentDetailArgs(), agent: registryAgent },
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ToastsTheInstalledRelease: Story = {
  args: {
    installation: installationArgs({
      notice: {
        key: 'operation',
        result: 'installed',
        version,
        action: 'Install',
      },
    }),
  },
  play: async () => {
    const title = `${readyAgent.name} installed`;
    await findToast(title);
    await expect(
      await findToast(`Version ${version}. Sign-in is checked separately.`),
    ).toBeVisible();
    await expect(await allToasts(title)).toHaveLength(1);
    await expect(await allToasts('Ready')).toHaveLength(0);
  },
};

// Finishing an update refreshes the page, which offers Install again before the toast shows.
export const ToastsTheUpdateItRan: Story = {
  args: {
    installation: installationArgs({
      notice: {
        key: 'operation',
        result: 'installed',
        version,
        action: 'Update',
      },
    }),
  },
  play: async () => {
    await expect(await findToast(`${readyAgent.name} updated`)).toBeVisible();
    await expect(await allToasts(`${readyAgent.name} installed`)).toHaveLength(
      0,
    );
  },
};

const failure = 'Node.js is required on the Server';
const failed = (action: 'Install' | 'Update'): Story => ({
  args: {
    agent:
      action === 'Update' ? { ...readyAgent, status: 'update' } : registryAgent,
    installation: installationArgs({
      action,
      notice: { key: 'operation', result: 'failed', failure, action },
    }),
  },
  play: async ({ canvas }) => {
    await findToast(`Could not ${action.toLowerCase()} ${readyAgent.name}`);
    await expect(await findToast(failure)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: action }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  },
});
export const ToastsTheFailureAndOffersInstallAgain = failed('Install');
export const ToastsTheFailureAndOffersUpdateAgain = failed('Update');
