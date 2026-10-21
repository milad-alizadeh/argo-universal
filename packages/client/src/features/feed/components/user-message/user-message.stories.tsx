import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
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

const variations = [
  {
    label: 'Text with inline code',
    row: recordedUserMessage('agent-1', 'interrupt'),
  },
  {
    label: 'With an image',
    row: recordedUserMessage('agent-2', 'image-prompt'),
  },
  { label: 'Markdown', row: recordedPrompt('agent-1', 'markdown-prompt') },
  {
    label: 'Long text',
    row: recordedUserMessage('agent-2', 'markdown-answer'),
  },
];

// Recorded prompts: inline code, an image, markdown and a long prompt; longer than four lines clamps behind Show more.
export const Overview: Story = {
  render: (args) => (
    <Variations>
      {variations.map(({ label, row }) => (
        <Variation key={label} label={label}>
          <UserMessage {...args} row={row} />
        </Variation>
      ))}
    </Variations>
  ),
};
