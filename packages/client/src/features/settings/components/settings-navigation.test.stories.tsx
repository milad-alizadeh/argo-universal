import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { settleViewport } from '../../../storybook/settle-viewport';
import { createNavigationRecorder } from '../../../storybook/with-navigation-mocks';
import { SettingsNavigationList } from './settings-navigation-list';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/SettingsNavigation',
  component: SettingsNavigationList,
  render: (args): React.JSX.Element => (
    <View className="h-[796px] w-full">
      <SettingsNavigationList {...args} />
    </View>
  ),
  parameters: { navigation: recorder },
  beforeEach: (): void => recorder.reset(),
} satisfies Meta<typeof SettingsNavigationList>;
export default meta;
type Story = StoryObj<typeof meta>;

function navigation(width: number): Story {
  return {
    args: { selectedDestination: { to: 'settings-accounts' } },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Accounts' }));
      await userEvent.click(canvas.getByRole('button', { name: 'Projects' }));
      await expect(recorder.destinations).toEqual([
        { to: 'settings-accounts' },
        { to: 'settings-projects' },
      ]);
      await expect(
        canvas.queryByRole('button', { name: 'Back to Settings' }),
      ).not.toBeInTheDocument();
    },
  };
}
export const PhoneListAndDetail: Story = {
  ...navigation(390),
  name: 'Phone navigation callbacks',
};
export const SidebarListAndDetail: Story = {
  ...navigation(1440),
  name: 'Wide navigation callbacks',
};
export const PhoneListAndDetailDark: Story = {
  ...PhoneListAndDetail,
  globals: { mode: 'dark' },
};
export const SidebarListAndDetailDark: Story = {
  ...SidebarListAndDetail,
  globals: { mode: 'dark' },
};
