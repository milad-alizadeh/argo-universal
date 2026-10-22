import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ArchivedBanner } from './archived-banner';

// The banner declares no props, so there is nothing for a Control or a props table to carry.
const meta = {
  title: 'Sessions/ArchivedBanner',
  component: ArchivedBanner,
  tags: ['!autodocs'],
} satisfies Meta<typeof ArchivedBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

// An archived Session's Feed stays readable; this takes the Composer's place.
export const Archived: Story = {};
