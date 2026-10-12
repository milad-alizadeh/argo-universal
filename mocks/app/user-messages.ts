import { UserMessage } from '@repo/contracts';
import messages from './user-message-recordings.json';

// Prompts sent through the real Engine with the scripted Agent and read back from the SQL Feed reader.
export const recordedUserMessages = messages.map((entry) => ({
  ...entry,
  row: UserMessage.parse(entry.row),
}));
