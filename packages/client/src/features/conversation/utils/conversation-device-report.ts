import type {
  ConversationDeviceChange,
  ConversationDeviceReport,
  ConversationDeviceRequest,
} from '@repo/contracts';
import type { ConversationDeviceChoice } from '../stores/conversation-device-choice';
import type { AudioDevices } from './audio-devices';

// What this App tells the Server of its microphones and speakers, so an Agent or the CLI can list and choose them.
export const deviceReportOf = (
  { microphones, speakers }: AudioDevices,
  choice: ConversationDeviceChoice,
): ConversationDeviceReport => ({ microphones, speakers, ...choice });

// Each choice the Server asks for is this Device's own, as if made in Settings › Conversation.
export const onDeviceRequest =
  (choose: (change: ConversationDeviceChange) => void) =>
  (request: ConversationDeviceRequest): void => {
    if (request.type === 'choose') choose(request.change);
  };
