import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  recordedAgentMessage,
  streamingAgentMessage,
} from '../../../../mocks/feed-message-mock';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { AgentMessage } from './agent-message';

const markdownAnswerId = 'markdown-answer';

const meta = {
  title: 'Feed/AgentMessage',
  component: AgentMessage,
  args: { row: recordedAgentMessage('agent-1', markdownAnswerId) },
} satisfies Meta<typeof AgentMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

// Both Agents' recorded markdown answers, and one caught mid-stream.
export const Overview: Story = {
  name: 'AgentMessage',
  render: () => (
    <Variations>
      <Variation label="Agent 1 answer">
        <AgentMessage row={recordedAgentMessage('agent-1', markdownAnswerId)} />
      </Variation>
      <Variation label="Agent 2 answer">
        <AgentMessage row={recordedAgentMessage('agent-2', markdownAnswerId)} />
      </Variation>
      <Variation label="Streaming">
        <AgentMessage
          row={streamingAgentMessage('agent-2', markdownAnswerId)}
        />
      </Variation>
    </Variations>
  ),
};
