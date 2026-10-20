import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { AppearanceDetailView } from './appearance-detail-view';

const meta = {
  title: 'Screens/Settings/Appearance',
  component: AppearanceDetailView,
  args: { theme: 'system', systemSource: 'macOS', onThemeChange: fn() },
  parameters: { screenPreview: true },
} satisfies Meta<typeof AppearanceDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Appearance: Story = {};
