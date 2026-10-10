import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../lib/generic/variations';
import {
  recordedImageUrl,
  recordedUserMessage,
} from '../../../lib/product/feed-message.mocks';
import { UserMessage } from './user-message';

const meta = {
  title: 'Feed/UserMessage',
  component: UserMessage,
  args: {
    row: recordedUserMessage('agent-1', 'interrupt'),
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof UserMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

// Recorded prompts: inline code, an image, and a long prompt clamped behind Show more.
export const Overview: Story = {
  name: 'UserMessage',
  render: (args) => (
    <Variations>
      <Variation label="Text with inline code">
        <UserMessage
          {...args}
          row={recordedUserMessage('agent-1', 'interrupt')}
        />
      </Variation>
      <Variation label="With an image">
        <UserMessage
          {...args}
          row={recordedUserMessage('agent-2', 'image-prompt')}
        />
      </Variation>
      <Variation label="Long text">
        <UserMessage
          {...args}
          row={recordedUserMessage('agent-2', 'markdown-answer')}
        />
      </Variation>
    </Variations>
  ),
};
