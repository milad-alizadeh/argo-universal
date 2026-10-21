import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { ArchiveSessionAlert } from './archive-session-alert';
import { archiveConfirm } from './archive-session-alert-fixtures';

const meta = {
  title: 'Sessions/ArchiveSessionAlert',
  component: ArchiveSessionAlert,
  argTypes: {
    open: { control: 'boolean' },
    onArchive: { control: false },
    onClose: { control: false },
  },
  args: {
    ...archiveConfirm,
    onArchive: action('archive Session'),
    onClose: action('close'),
  },
} satisfies Meta<typeof ArchiveSessionAlert>;

export default meta;

type Story = StoryObj<typeof meta>;

// iOS and Android ask before every archive; the web preview draws the centred alert.
export const Confirm: Story = { args: archiveConfirm };

// Closed, the alert draws nothing, so it has no story.
