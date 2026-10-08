import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { SettingsListMock } from '../../mocks/settings-list-mock';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';

const exampleProjectId = 'example-project';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/SettingsNavigation',
  component: SettingsListMock,
  args: { page: 'settings' },
  render: (args) => (
    <View className="h-[796px] w-full">
      <SettingsListMock {...args} />
    </View>
  ),
  parameters: { navigation: recorder },
  beforeEach: () => recorder.reset(),
} satisfies Meta<typeof SettingsListMock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PhoneListAndDetail: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
    await expect(await canvas.findByTestId('phone-shell')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Accounts' }));
    await expect(
      await canvas.findByText('Accounts will appear here.'),
    ).toBeVisible();
    await expect(canvas.queryByTestId('phone-shell')).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Back to Settings' }),
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Projects' }),
    );
    await userEvent.click(
      await canvas.findByRole('button', {
        name: exampleProjectId,
      }),
    );
    await expect(
      await canvas.findByText('Settings for example-project will appear here.'),
    ).toBeVisible();
    await expect(recorder.destinations[0]).toEqual({ to: 'settings-accounts' });
    await expect(recorder.destinations.at(-1)).toEqual({
      to: 'settings-project',
      name: exampleProjectId,
    });
  },
};

export const SidebarListAndDetail: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    await expect(
      await canvas.findByText('Accounts will appear here.'),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Accounts' }),
    ).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Projects' }));
    await userEvent.click(
      canvas.getByRole('button', { name: exampleProjectId }),
    );
    await expect(
      await canvas.findByText('Settings for example-project will appear here.'),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Projects' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      canvas.getByRole('button', { name: 'Accounts' }),
    ).toBeVisible();
    await expect(recorder.destinations).toEqual([
      { to: 'settings-projects' },
      { to: 'settings-project', name: exampleProjectId },
    ]);
  },
};

export const PhoneListAndDetailDark: Story = {
  ...PhoneListAndDetail,
  globals: { mode: 'dark' },
};

export const SidebarListAndDetailDark: Story = {
  ...SidebarListAndDetail,
  globals: { mode: 'dark' },
};
