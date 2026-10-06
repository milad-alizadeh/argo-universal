import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { renderRecordedActivity } from '../../mocks/tool-call-group-preview';
import { toolCallGroupMock } from '../../mocks/tool-call-mock';
import { ToolCallGroup } from './ToolCallGroup';

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
      <Variation label="Running group, expanded">
        <ToolCallGroup
          group={toolCallGroupMock.running}
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
