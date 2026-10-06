import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { toolCallGroupMock } from '../../mocks/tool-call-mock';
import { ExploredRow } from './ExploredRow';

const meta = {
  title: 'Sessions/Feed/ExploredRow',
  component: ExploredRow,
  args: { exploration: toolCallGroupMock.exploration },
} satisfies Meta<typeof ExploredRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'ExploredRow',
  render: () => (
    <Variations className="max-w-composer!">
      <Variation label="Explored">
        <ExploredRow exploration={toolCallGroupMock.exploration} />
      </Variation>
      <Variation label="Explored, expanded">
        <ExploredRow exploration={toolCallGroupMock.exploration} initialOpen />
      </Variation>
    </Variations>
  ),
};
