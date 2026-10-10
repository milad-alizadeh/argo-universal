import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../lib/generic/variations';
import { ToolCallRow } from './tool-call-row';
import { completedRead, runningRead } from './tool-call.mocks';

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
