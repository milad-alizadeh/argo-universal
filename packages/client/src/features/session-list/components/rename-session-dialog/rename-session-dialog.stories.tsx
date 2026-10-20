import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { RenameSessionDialog } from './rename-session-dialog';

const meta = {
  title: 'SessionList/RenameSessionDialog',
  component: RenameSessionDialog,
  args: {
    title: 'Build the Session layout',
    open: true,
    onRename: action('rename Session'),
    onClose: action('close'),
  },
} satisfies Meta<typeof RenameSessionDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

// The field opens with the whole title selected, so typing replaces it.
export const Editing: Story = {};

// The Server refused the new title: the dialog stays open and says so under the field.
export const RenameFailed: Story = {
  args: { error: 'Couldn’t rename the Session. Try again.' },
};
