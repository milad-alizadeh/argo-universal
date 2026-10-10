import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { customAgentMocks } from '../../../../mocks/agents-mock';
import { CustomAgentScreen } from './custom-agent-screen';

const meta = {
  title: 'Screens/CustomAgentScreen',
  component: CustomAgentScreen,
  parameters: { trpc: customAgentMocks, screenPreview: true },
} satisfies Meta<typeof CustomAgentScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'CustomAgentScreen' };
