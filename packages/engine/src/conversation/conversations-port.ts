import type {
  ConversationEndOutput,
  VoicePreviewInput,
  VoicePreviewOutput,
  ConversationStartInput,
  ConversationStartOutput,
  ConversationStatus,
} from '@repo/contracts';
import type { ConversationSessions } from './session-link';
import type { VoiceChoicesPort } from './voice-choices';
import type { VoiceClipDesk } from './voice-clip-desk';
import type { ConversationDevices } from './conversation-devices';

// What the App and Operations ask of the Conversation: start it, end it, read it, watch it.
export interface ConversationsPort {
  status: () => Promise<ConversationStatus>;
  start: (
    input: ConversationStartInput,
    connection?: AbortSignal,
  ) => Promise<ConversationStartOutput>;
  end: (sessionId?: string) => ConversationEndOutput;
  // An Agent ends its Session's call; refused when the Session has no call.
  hangUp: (sessionId?: string) => ConversationEndOutput;
  watch: (signal: AbortSignal) => AsyncGenerator<ConversationStatus>;
  // Gives the call the Sessions it sends Prompts to and listens to.
  attach: (sessions: ConversationSessions) => void;
  // Settings › Conversation: what the person chose and can choose from, and changing it; the next call uses it.
  choices: VoiceChoicesPort;
  // The microphones and speakers of the Apps that can carry a call, read and chosen by Agents and the CLI.
  devices: ConversationDevices;
  // Settings › Conversation: one greeting in a voice, played while no call runs.
  preview: (input: VoicePreviewInput) => Promise<VoicePreviewOutput>;
  // The greetings the App recorded from previews; later previews replay them with no provider call.
  previewClips: Pick<VoiceClipDesk, 'get' | 'store'>;
}
