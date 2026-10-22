import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PermissionOutcome } from './permission-outcome';
import {
  deniedOutcome,
  otherAllowOptionOutcome,
  otherRejectOptionOutcome,
} from './permission-outcome-fixtures';

const meta = {
  title: 'Feed/PermissionOutcome',
  component: PermissionOutcome,
  argTypes: {
    outcome: {
      control: false,
      description: 'What the user chose, with the option the Agent offered.',
    },
  },
  args: deniedOutcome,
} satisfies Meta<typeof PermissionOutcome>;

export default meta;

type Story = StoryObj<typeof meta>;

// The user denied the request once.
export const Denied: Story = { args: deniedOutcome };

// An allow option the Agent named: the row says what the user chose.
export const ChoseAnotherAllowOption: Story = {
  args: otherAllowOptionOutcome,
};

// A reject option the Agent named: the row says what the user chose.
export const ChoseAnotherRejectOption: Story = {
  args: otherRejectOptionOutcome,
};
