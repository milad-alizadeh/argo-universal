import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../../lib/generic/variations';
import {
  recordedImageUrl,
  recordedPrompt,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
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

// Recorded prompts: inline code, an image, markdown and a long prompt; longer than four lines clamps behind Show more.
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
      <Variation label="Markdown">
        <UserMessage
          {...args}
          row={recordedPrompt('agent-1', 'markdown-prompt')}
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
