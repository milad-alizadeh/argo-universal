import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { DropdownMenuPreview } from './dropdown-menu-preview.mocks';

const meta = {
  title: 'Design System/Primitives/DropdownMenu',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Dropdown Menu',
  render: () => <DropdownMenuPreview />,
};
