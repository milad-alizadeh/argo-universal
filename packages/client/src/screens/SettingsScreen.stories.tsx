import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SettingsScreen } from './SettingsScreen';

const meta = { component: SettingsScreen } satisfies Meta<
  typeof SettingsScreen
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
