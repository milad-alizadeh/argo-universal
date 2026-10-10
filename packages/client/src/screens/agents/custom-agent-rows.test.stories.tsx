import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { agentCatalogMocks } from '../../../mocks/agent-catalog-mock';
import {
  customAgentDefinition,
  customAgentId,
} from '../../../mocks/custom-agent-mock';
import { createNavigationRecorder } from '../../../mocks/with-navigation-mocks';
import { AgentsSettingsScreen } from './agents-settings-screen';

const meta = {
  title: 'Tests/CustomAgentRows',
  component: AgentsSettingsScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentsSettingsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

const recorder = createNavigationRecorder();
export const OpensCustomAgents: Story = {
  parameters: { trpc: agentCatalogMocks, navigation: recorder },
  beforeEach: (): void => recorder.reset(),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Add custom' }),
    );
    await userEvent.click(
      await canvas.findByRole('link', { name: customAgentDefinition.name }),
    );
    await expect(recorder.destinations).toEqual([
      { to: 'settings-agent-new' },
      { to: 'settings-agent', agent: customAgentId },
    ]);
  },
};
