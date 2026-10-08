import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { completedRead, runningRead } from '../../mocks/tool-call-mock';
import { ToolCallRow } from './tool-call-row';

const meta = {
  title: 'Sessions/Feed/ToolCallRow',
  component: ToolCallRow,
  args: { row: completedRead },
} satisfies Meta<typeof ToolCallRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'ToolCallRow',
  render: () => (
    <Variations className="max-w-composer!">
      <Variation label="Reading file">
        <ToolCallRow row={runningRead} />
      </Variation>
      <Variation label="Read file">
        <ToolCallRow row={completedRead} />
      </Variation>
      <Variation label="Read file, expanded">
        <ToolCallRow row={completedRead} initialOpen />
      </Variation>
    </Variations>
  ),
};
