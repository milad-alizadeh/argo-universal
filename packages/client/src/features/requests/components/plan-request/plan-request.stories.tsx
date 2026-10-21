import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { RequestFrame } from '../../../../lib/product/request-frame';
import { PermissionRequest } from '../permission-request/permission-request';
import { openPlan, sendingPlan } from './plan-request-fixtures';

// A request carrying a plan draws as the plan, under its title, with Build or keep planning.
const meta = {
  title: 'Requests/PlanRequest',
  component: PermissionRequest,
  parameters: { previewPadding: false },
  argTypes: {
    request: {
      control: false,
      description: 'The pending request, with the plan the Agent wrote.',
    },
    state: {
      control: false,
      description: 'Open, submitting, or answered with the reason.',
    },
    input: { control: 'text' },
    reason: { control: 'text' },
    error: { control: 'text' },
    onAnswer: { control: false },
    onBuildInNewSession: { control: false },
    onSavePlan: { control: false },
  },
  render: (args): React.JSX.Element => (
    <RequestFrame>
      <PermissionRequest {...args} />
    </RequestFrame>
  ),
  args: {
    ...openPlan,
    onAnswer: action('answer'),
    onBuildInNewSession: action('build in a new Session'),
    onSavePlan: action('save the Plan'),
  },
} satisfies Meta<typeof PermissionRequest>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = { args: openPlan };

// The answer is on its way to the Agent.
export const Sending: Story = { args: sendingPlan };
