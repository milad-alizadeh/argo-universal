import { AgentMessage } from '@repo/contracts';
import messages from './streaming-messages.json';

// Saved from recorded events through the real Feed reducer during fixture preparation.
export const recordedStreamingMessages = messages.map((entry) => ({
  ...entry,
  row: AgentMessage.parse(entry.row),
}));
