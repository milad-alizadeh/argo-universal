import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Variation, Variations } from '../../generic/variations';
import {
  StatusIndicator,
  type StatusIndicatorProps,
  statusLabels,
} from './status-indicator';

const meta = {
  title: 'Shared/StatusIndicator',
  component: StatusIndicator,
  args: { status: 'running' },
} satisfies Meta<typeof StatusIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

const storyStatuses = [
  'running',
  'needs_input',
  'failed',
  'unread',
  'idle',
] as const;

function StatusVariations(args: StatusIndicatorProps): React.JSX.Element[] {
  return storyStatuses.map((status) => (
    <Variation key={status} label={statusLabels[status]}>
      <StatusIndicator {...args} status={status} />
    </Variation>
  ));
}

export const Overview: Story = {
  name: 'StatusIndicator',
  render: (args) => (
    <Variations>
      <StatusVariations {...args} />
      <Variation label="Small">
        <StatusIndicator {...args} size="small" />
      </Variation>
      <Variation label="On a selected surface">
        <StatusIndicator
          {...args}
          className="border-sidebar-accent bg-sidebar-accent"
        />
      </Variation>
    </Variations>
  ),
};
