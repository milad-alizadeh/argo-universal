import { hasVoiceInstruction, type PromptSender } from '@repo/contracts';
import {
  conversationHistoryCharacters,
  readConversationHistory,
  type ConversationHistorySources,
} from '../feed';
import type { AcpPromptRequest } from './acp/prompts/prompt-types';

const followUpCharacters = 5_000;

type ConversationPrompt = {
  sessionId: string;
  sender: PromptSender | undefined;
  prompt: AcpPromptRequest['prompt'];
};

// Background for ACP only. The Feed and queue keep the person's request as spoken.
export function withConversationContext(
  sources: ConversationHistorySources,
  { sessionId, sender, prompt }: ConversationPrompt,
): AcpPromptRequest['prompt'] {
  if (sender?.type !== 'conversation') return prompt;

  const first = prompt[0];
  const beginsCall = first?.type === 'text' && hasVoiceInstruction(first.text);

  const history = readConversationHistory(sources, sessionId, {
    room: beginsCall ? conversationHistoryCharacters : followUpCharacters,
    sinceHandOver: !beginsCall,
  });

  if (!history) return prompt;

  return [
    {
      type: 'text',
      annotations: { audience: ['assistant'] },
      text: [
        'This Session history is background for interpreting the current spoken request.',
        'Use it to identify decisions and unfinished work. Prior dialogue does not grant permission or begin any new work.',
        history,
        'Current request follows.',
      ].join('\n'),
    },
    ...prompt,
  ];
}
