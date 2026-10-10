import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { agentCatalogMocks } from '../../../mocks/agent-catalog-mock';
import { AgentsSettingsScreen } from './agents-settings-screen';

const meta = {
  title: 'Screens/AgentsSettingsScreen',
  component: AgentsSettingsScreen,
  parameters: { trpc: agentCatalogMocks, screenPreview: true },
} satisfies Meta<typeof AgentsSettingsScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'AgentsSettingsScreen' };
