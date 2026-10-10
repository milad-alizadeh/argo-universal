import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { RegistryIcon } from './registry-icon';
import { iconAgent } from './registry-icons.mocks';

const meta = {
  title: 'Agents/RegistryIcon',
  component: RegistryIcon,
  args: { agentName: iconAgent.entry.name, uri: undefined },
  argTypes: { uri: { control: 'text' } },
} satisfies Meta<typeof RegistryIcon>;
export default meta;

export const Unavailable: StoryObj<typeof meta> = { name: 'RegistryIcon' };
