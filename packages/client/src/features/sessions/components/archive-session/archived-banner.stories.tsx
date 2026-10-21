import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ArchivedBanner } from './archived-banner';

// The banner declares no props, so it has no argTypes and no fixtures, and its Docs page has no table.
const meta = {
  title: 'Sessions/ArchivedBanner',
  component: ArchivedBanner,
} satisfies Meta<typeof ArchivedBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

// An archived Session's Feed stays readable; this takes the Composer's place.
export const Archived: Story = {};
