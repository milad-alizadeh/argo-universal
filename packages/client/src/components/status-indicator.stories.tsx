import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { StatusIndicator, statusLabels } from './status-indicator';

const meta = {
  title: 'Shared/StatusIndicator',
  component: StatusIndicator,
  args: { status: 'running' },
} satisfies Meta<typeof StatusIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'StatusIndicator',
  render: (args) => (
    <Variations>
      {(['running', 'needs_input', 'failed', 'unread', 'idle'] as const).map(
        (status) => (
          <Variation key={status} label={statusLabels[status]}>
            <StatusIndicator {...args} status={status} />
          </Variation>
        ),
      )}
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
