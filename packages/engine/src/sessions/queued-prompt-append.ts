import { QueuedPromptId } from '@repo/contracts';
import type {
  SentPromptSender,
  QueuedPrompt,
  QueueCommand,
} from '@repo/contracts';

// An append may carry the sender of a Prompt that did not come from the user, such as a Plugin's.
export type AppendCommand = Extract<QueueCommand, { action: 'append' }> & {
  sender?: SentPromptSender;
};

export const appendedPrompt = (
  command: AppendCommand,
  id: string,
): QueuedPrompt => ({
  id: QueuedPromptId.parse(id),
  prompt: command.prompt,
  followUpSuggestions: command.followUpSuggestions,
  ...(command.sender && { sender: command.sender }),
  revision: 0,
});
