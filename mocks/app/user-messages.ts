import { UserMessage } from '@repo/contracts';
import messages from './user-message-recordings.json';

// Recorded by `node tools/record-user-messages.mts` through the real Engine, scripted Agent and SQL Feed reader.
export const recordedUserMessages = messages.map((entry) => ({
  ...entry,
  row: UserMessage.parse(entry.row),
}));
