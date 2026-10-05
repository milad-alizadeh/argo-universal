import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { SettingsListMock } from '../../mocks/settings-list-mock';

const meta = {
  title: 'Screens/Placeholders',
  component: SettingsListMock,
  render: (args) => (
    <View className="h-[796px] w-full">
      <SettingsListMock {...args} />
    </View>
  ),
} satisfies Meta<typeof SettingsListMock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Issues: Story = { args: { page: 'issues' } };
export const Atlas: Story = { args: { page: 'atlas' } };
export const Accounts: Story = { args: { page: 'accounts' } };
export const ProjectSettings: Story = { args: { page: 'project' } };
export const Settings: Story = { args: { page: 'settings' } };
