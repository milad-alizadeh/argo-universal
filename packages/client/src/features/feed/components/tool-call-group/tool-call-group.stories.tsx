import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { toolCallGroupMock } from '../tool-call.mocks';
import { ToolCallGroup, type ToolCallGroupProps } from './tool-call-group';
import { renderRecordedActivity } from './tool-call-group-preview.mocks';

const variations: (Omit<ToolCallGroupProps, 'renderActivity'> & {
  label: string;
})[] = [
  {
    label: 'Running group',
    group: toolCallGroupMock.running,
    now: toolCallGroupMock.now,
  },
  {
    label: 'Parallel calls: earlier command still running',
    group: toolCallGroupMock.parallel,
    now: toolCallGroupMock.now,
    initialOpen: true,
  },
  { label: 'Settled group', group: toolCallGroupMock.group },
  {
    label: 'Settled group, expanded',
    group: toolCallGroupMock.group,
    initialOpen: true,
  },
];

const meta = {
  title: 'Feed/ToolCallGroup',
  component: ToolCallGroup,
  args: {
    group: toolCallGroupMock.group,
    renderActivity: renderRecordedActivity,
  },
} satisfies Meta<typeof ToolCallGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <Variations className="max-w-column!">
      {variations.map(({ label, ...props }) => (
        <Variation key={label} label={label}>
          <ToolCallGroup {...props} renderActivity={renderRecordedActivity} />
        </Variation>
      ))}
    </Variations>
  ),
};
