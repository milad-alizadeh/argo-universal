import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { EditRow } from './edit-row';
import { failedEdit, multiFileEdit, singleFileEdit } from './edit-row-fixtures';

const meta = {
  title: 'Feed/EditRow',
  component: EditRow,
  // The recorded `tool_call_update`; its diffs and its status decide which edit the row draws.
  argTypes: { row: { control: false } },
  args: singleFileEdit,
} satisfies Meta<typeof EditRow>;

export default meta;

type Story = StoryObj<typeof meta>;

// One file: the edit heads its own disclosure, which opens on its diff.
export const SingleFile: Story = { args: singleFileEdit };

// Several files in one Tool call: a counted header opens on one nested disclosure per file.
export const MultipleFiles: Story = { args: multiFileEdit };

// The Tool call failed, so the row reads "Couldn't edit" with the path and the error.
export const Failed: Story = { args: failedEdit };
