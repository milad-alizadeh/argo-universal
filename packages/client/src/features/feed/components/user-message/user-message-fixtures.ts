import {
  recordedPrompt,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import type { UserMessageProps } from './user-message';

// A story supplies where images load from; a fixture is the prompt as the person sent it.
type UserMessageFixture = Omit<UserMessageProps, 'imageUrl'>;

export const markdownPrompt = {
  row: recordedPrompt('agent-1', 'markdown-prompt'),
} satisfies UserMessageFixture;

export const imagePrompt = {
  row: recordedUserMessage('agent-2', 'image-prompt'),
} satisfies UserMessageFixture;

export const clampedPrompt = {
  row: recordedUserMessage('agent-2', 'markdown-answer'),
} satisfies UserMessageFixture;

export const delegatedPrompt = {
  row: {
    ...recordedPrompt('agent-1', 'markdown-prompt'),
    sessionUpdate: 'prompt_message',
    _meta: {
      argo: {
        sender: {
          type: 'session',
          sessionId: 'review-session',
          title: 'Review changes',
        },
      },
    },
  },
} satisfies UserMessageFixture;

export const pluginPrompt = {
  row: {
    ...delegatedPrompt.row,
    _meta: {
      argo: {
        sender: { type: 'plugin', pluginId: 'automation', title: 'Automation' },
      },
    },
  },
} satisfies UserMessageFixture;
