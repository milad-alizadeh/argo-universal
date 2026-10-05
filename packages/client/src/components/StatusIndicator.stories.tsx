import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { StatusIndicator, statusLabels } from './StatusIndicator';

const meta = {
  title: 'Shared/StatusIndicator',
  component: StatusIndicator,
  args: { status: 'running' },
} satisfies Meta<typeof StatusIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Status: Story = {
  render: (args) => (
    <Variations>
      {(['running', 'needs_input', 'failed', 'unread', 'idle'] as const).map(
        (status) => (
          <Variation key={status} label={statusLabels[status]}>
            <StatusIndicator {...args} status={status} />
          </Variation>
        ),
      )}
    </Variations>
  ),
};

export const Size: Story = {
  render: (args) => (
    <Variations>
      {(['default', 'small'] as const).map((size) => (
        <Variation key={size} label={size}>
          <StatusIndicator {...args} size={size} />
        </Variation>
      ))}
    </Variations>
  ),
};

export const ClassName: Story = {
  render: (args) => (
    <Variations>
      <Variation label="Background border">
        <StatusIndicator {...args} />
      </Variation>
      <Variation label="Selected border">
        <StatusIndicator {...args} className="border-sidebar-accent" />
      </Variation>
    </Variations>
  ),
};
