import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { RenameSessionDialog } from './rename-session-dialog';
import { editingTitle, renameFailed } from './rename-session-dialog-fixtures';

const meta = {
  title: 'Sessions/RenameSessionDialog',
  component: RenameSessionDialog,
  argTypes: {
    title: { control: 'text' },
    open: { control: 'boolean' },
    error: { control: 'text' },
    onRename: { control: false },
    onClose: { control: false },
  },
  args: {
    ...editingTitle,
    onRename: action('rename Session'),
    onClose: action('close'),
  },
} satisfies Meta<typeof RenameSessionDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

// The field opens with the whole title selected, so typing replaces it.
export const Editing: Story = { args: editingTitle };

// The Server refused the new title: the dialog stays open and says so under the field.
export const RenameFailed: Story = { args: renameFailed };

// Closed, the dialog draws nothing, so it has no story.
