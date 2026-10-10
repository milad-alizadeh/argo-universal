import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { iconAgent } from '../../../mocks/registry-icons';
import { RegistryIcon } from './registry-icon';

const meta = {
  title: 'Components/RegistryIcon',
  component: RegistryIcon,
  args: { agentName: iconAgent.entry.name, uri: undefined },
  argTypes: { uri: { control: 'text' } },
} satisfies Meta<typeof RegistryIcon>;
export default meta;

export const Unavailable: StoryObj<typeof meta> = { name: 'RegistryIcon' };
