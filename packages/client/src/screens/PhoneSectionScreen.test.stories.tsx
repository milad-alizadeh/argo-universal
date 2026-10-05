import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { PhoneSectionScreen } from './PhoneSectionScreen';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/PhoneSectionScreen',
  component: PhoneSectionScreen,
  args: { section: 'sessions' },
  render: (args) => (
    <View className="h-[796px] w-full">
      <PhoneSectionScreen {...args} />
    </View>
  ),
  parameters: { navigation: recorder },
  beforeEach: async () => {
    recorder.reset();
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
  },
} satisfies Meta<typeof PhoneSectionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DrawerOpensSectionLists: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByText('Sessions list will appear here.'),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: 'Sessions', level: 1 }),
    ).toBeVisible();
    for (const section of ['Settings', 'Atlas']) {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open navigation' }),
      );
      await userEvent.click(
        await canvas.findByRole('button', { name: new RegExp(`^${section}$`) }),
      );
    }
    await expect(recorder.destinations).toEqual([
      { to: 'settings' },
      { to: 'atlas' },
    ]);
  },
};

export const SettingsListOpensItsPages: Story = {
  args: { section: 'settings' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Connection' }),
    );
    await expect(recorder.destinations).toEqual([
      { to: 'settings-connection' },
    ]);
  },
};
