import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SessionScreen } from './SessionScreen';

const meta = {
  component: SessionScreen,
  args: { id: 'session-1' },
} satisfies Meta<typeof SessionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};
