import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { settleViewport } from '../../mocks/settle-viewport';
import {
  AccountsScreen,
  AtlasScreen,
  IssuesScreen,
  ProjectSettingsScreen,
} from './placeholder-screens';

const meta = {
  title: 'Tests/PlaceholderScreens',
  component: AccountsScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof AccountsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

function placeholder(description: string): NonNullable<Story['play']> {
  return async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await expect(canvas.getByText(description)).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Back to Settings' }),
      ).not.toBeInTheDocument();
    }
  };
}
export const Issues: Story = {
  render: () => <IssuesScreen />,
  play: placeholder('Issues will appear here.'),
};
export const Atlas: Story = {
  render: () => <AtlasScreen />,
  play: placeholder('Atlas will appear here.'),
};
export const Accounts: Story = {
  play: placeholder('Accounts will appear here.'),
};
export const ProjectSettings: Story = {
  render: () => <ProjectSettingsScreen name="example-project" />,
  play: placeholder('Settings for example-project will appear here.'),
};
export const IssuesDark: Story = { ...Issues, globals: { mode: 'dark' } };
export const AtlasDark: Story = { ...Atlas, globals: { mode: 'dark' } };
export const AccountsDark: Story = { ...Accounts, globals: { mode: 'dark' } };
export const ProjectSettingsDark: Story = {
  ...ProjectSettings,
  globals: { mode: 'dark' },
};
