import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { iconAgent } from '../registry-icons.mocks';
import { RegistryIcon } from './registry-icon';

const meta = {
  title: 'Agents/RegistryIcon',
  component: RegistryIcon,
  args: { agentName: iconAgent.entry.name, uri: undefined, role: 'control' },
  argTypes: { uri: { control: 'text' } },
} satisfies Meta<typeof RegistryIcon>;

export default meta;

export const Unavailable: StoryObj<typeof meta> = { name: 'RegistryIcon' };
