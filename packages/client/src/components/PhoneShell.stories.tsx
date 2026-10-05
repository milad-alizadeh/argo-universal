import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { PhoneShellMock } from '../../mocks/phone-shell-mock';
import { PhoneShell } from './PhoneShell';

const meta = {
  title: 'Shell/PhoneShell',
  component: PhoneShell,
  argTypes: {
    selectedSection: {
      control: 'select',
      options: ['sessions', 'issues', 'atlas', 'settings'],
    },
    attentionCount: { control: 'number' },
    drawerOpen: { control: 'boolean' },
  },
  render: (args) => (
    <View className="h-[600px] w-full">
      <PhoneShellMock {...args} />
    </View>
  ),
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    drawerOpen: false,
    children: null,
    onDrawerOpenChange: action('drawer open changed'),
    onSectionChange: action('section changed'),
    onSearch: action('search'),
    onFilter: action('filter'),
  },
} satisfies Meta<typeof PhoneShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectedSection: Story = { args: { drawerOpen: true } };
export const AttentionCount: Story = {
  args: { attentionCount: 100, drawerOpen: true },
};
export const DrawerOpen: Story = { args: { drawerOpen: true } };
