import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { SettingsListMock } from '../../mocks/settings-list-mock';

const meta = {
  title: 'Tests/Placeholders',
  component: SettingsListMock,
  render: (args) => (
    <View className="h-[796px] w-full">
      <SettingsListMock {...args} />
    </View>
  ),
} satisfies Meta<typeof SettingsListMock>;
export default meta;
type Story = StoryObj<typeof meta>;

const checkPlaceholder: NonNullable<Story['play']> = async ({
  canvas,
  args,
}) => {
  const { page } = await import('vitest/browser');
  const description =
    args.page === 'project'
      ? 'Settings for example-project will appear here.'
      : `${args.page === 'issues' ? 'Issues' : args.page === 'atlas' ? 'Atlas' : 'Accounts'} will appear here.`;
  for (const width of [390, 1440]) {
    await page.viewport(width, 844);
    await waitFor(() => expect(canvas.getByText(description)).toBeVisible());
    if (width === 1440)
      await expect(await canvas.findByTestId('desktop-shell')).toBeVisible();
    else if (args.page === 'issues' || args.page === 'atlas')
      await expect(await canvas.findByTestId('phone-shell')).toBeVisible();
    else
      await expect(
        await canvas.findByRole('button', { name: 'Back to Settings' }),
      ).toBeVisible();
  }
};

export const Issues: Story = {
  args: { page: 'issues' },
  play: checkPlaceholder,
};
export const Atlas: Story = { args: { page: 'atlas' }, play: checkPlaceholder };
export const Accounts: Story = {
  args: { page: 'accounts' },
  play: checkPlaceholder,
};
export const ProjectSettings: Story = {
  args: { page: 'project' },
  play: checkPlaceholder,
};

export const IssuesDark: Story = { ...Issues, globals: { mode: 'dark' } };

export const AtlasDark: Story = { ...Atlas, globals: { mode: 'dark' } };

export const AccountsDark: Story = { ...Accounts, globals: { mode: 'dark' } };

export const ProjectSettingsDark: Story = {
  ...ProjectSettings,
  globals: { mode: 'dark' },
};
