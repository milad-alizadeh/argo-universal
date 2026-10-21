import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ArchivedBanner } from './archived-banner';

const meta = {
  title: 'Sessions/ArchivedBanner',
  component: ArchivedBanner,
} satisfies Meta<typeof ArchivedBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Archived: Story = {};
