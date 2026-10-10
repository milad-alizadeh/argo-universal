import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { toolCallGroupMock } from '../../../mocks/tool-call-mock';
import { Variation, Variations } from '../../../storybook/variations';
import { ToolCallGroup } from './tool-call-group';
import { renderRecordedActivity } from './tool-call-group-preview.mocks';

const meta = {
  title: 'Sessions/Feed/ToolCallGroup',
  component: ToolCallGroup,
  args: {
    group: toolCallGroupMock.group,
    renderActivity: renderRecordedActivity,
  },
} satisfies Meta<typeof ToolCallGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'ToolCallGroup',
  render: () => (
    <Variations className="max-w-composer!">
      <Variation label="Running group">
        <ToolCallGroup
          group={toolCallGroupMock.running}
          now={toolCallGroupMock.now}
          renderActivity={renderRecordedActivity}
        />
      </Variation>
      <Variation label="Parallel calls: earlier command still running">
        <ToolCallGroup
          group={toolCallGroupMock.parallel}
          now={toolCallGroupMock.now}
          renderActivity={renderRecordedActivity}
          initialOpen
        />
      </Variation>
      <Variation label="Settled group">
        <ToolCallGroup
          group={toolCallGroupMock.group}
          renderActivity={renderRecordedActivity}
        />
      </Variation>
      <Variation label="Settled group, expanded">
        <ToolCallGroup
          group={toolCallGroupMock.group}
          renderActivity={renderRecordedActivity}
          initialOpen
        />
      </Variation>
    </Variations>
  ),
};
