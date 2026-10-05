import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { Text } from '../primitives/text';
import { PhoneSectionsLayout } from './PhoneSectionsLayout';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/PhoneSectionsLayout',
  component: PhoneSectionsLayout,
  args: {
    section: 'sessions',
    children: <Text testID="list-content">List</Text>,
  },
  render: (args) => (
    <View className="h-[796px] w-full">
      <PhoneSectionsLayout {...args} />
    </View>
  ),
  parameters: { navigation: recorder },
  beforeEach: async () => {
    recorder.reset();
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
  },
} satisfies Meta<typeof PhoneSectionsLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DrawerOpensSectionLists: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByTestId('list-content')).toBeVisible();
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
