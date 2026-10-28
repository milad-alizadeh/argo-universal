import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { PermissionPreview } from '../../../../../mocks/requests/permission/permission-gallery';
import { PermissionRequest } from './permission-request';
import {
  argoPermission,
  answeredPermission,
  severalAllowOptionsPermission,
  severalRejectOptionsPermission,
  toolCallPermission,
} from './permission-request-fixtures';

// The request in the Composer's tray, where a Session shows it.
const meta = {
  title: 'Requests/PermissionRequest',
  component: PermissionRequest,
  parameters: { previewPadding: false },
  argTypes: {
    request: {
      control: false,
      description: 'The pending request and the options the Agent offers.',
    },
    state: {
      control: false,
      description: 'Open, submitting, or answered with the reason.',
    },
    input: {
      control: 'text',
      description: 'What the Tool call would run, as the Agent sent it.',
    },
    reason: {
      control: 'text',
      description: 'Why the Agent is asking, when it says.',
    },
    error: { control: 'text' },
    onAnswer: { control: false },
    onBuildInNewSession: { control: false },
    onSavePlan: { control: false },
  },
  render: (args): React.JSX.Element => <PermissionPreview {...args} />,
  args: { ...toolCallPermission, onAnswer: action('answer') },
} satisfies Meta<typeof PermissionRequest>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * A Tool call to let run: its title, the Agent's reason and its input. The other branch, a request
 * carrying a plan, is PlanRequest's own story.
 */
export const ToolCall: Story = { args: toolCallPermission };

// Two allow options: the group leads with Allow once and a chevron picks the other.
export const SeveralAllowOptions: Story = {
  args: severalAllowOptionsPermission,
};

// Both groups offer more than one option, so both take a chevron.
export const SeveralRejectOptions: Story = {
  args: severalRejectOptionsPermission,
};

export const AlreadyAnswered: Story = { args: answeredPermission };

export const ArgoOperation: Story = { args: argoPermission };
