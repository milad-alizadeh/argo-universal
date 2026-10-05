import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { emptySessionListMocks } from '../../mocks/session-list-mock';
import { SectionRootScreen } from './SectionRootScreen';

const meta = {
  title: 'Tests/SectionRootScreen',
  component: SectionRootScreen,
  args: { section: 'settings' },
  render: (args) => (
    <View className="h-[796px] w-full">
      <SectionRootScreen {...args} />
    </View>
  ),
  parameters: { trpc: emptySessionListMocks },
} satisfies Meta<typeof SectionRootScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WideOpensTheFirstPage: Story = {
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    await expect(
      await canvas.findByText('Accounts will appear here.'),
    ).toBeVisible();
    await expect(canvas.queryByTestId('phone-shell')).toBeNull();
  },
};

export const PhoneShowsTheList: Story = {
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
    await expect(await canvas.findByTestId('phone-shell')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Connection' }),
    ).toBeVisible();
    await expect(canvas.queryByText('Accounts will appear here.')).toBeNull();
  },
};
