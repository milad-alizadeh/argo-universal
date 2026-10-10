import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { DropdownMenuPreview } from '../../mocks/dropdown-menu-preview';

const meta = {
  title: 'Design System/Primitives/Dropdown Menu',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Dropdown Menu',
  render: () => <DropdownMenuPreview />,
};
