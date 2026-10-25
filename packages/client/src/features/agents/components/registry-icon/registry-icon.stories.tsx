import { iconSizes } from '@repo/contracts/kit-symbols';
import { RegistryIcon } from '@repo/kit/primitives/content/agent-logo';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  loadedRegistryIcon,
  unavailableRegistryIcon,
} from './registry-icon-fixtures';

const meta = {
  title: 'Agents/RegistryIcon',
  component: RegistryIcon,
  args: unavailableRegistryIcon,
  argTypes: {
    uri: { control: 'text' },
    agentName: { control: 'text' },
    size: { control: 'select', options: [...iconSizes] },
  },
} satisfies Meta<typeof RegistryIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Registry entry carries an icon, which paints in the foreground.
export const Loaded: Story = { args: loadedRegistryIcon };

// No icon to draw, or one that fails to load: the Agent glyph stands in.
export const Unavailable: Story = { args: unavailableRegistryIcon };
