import type {
  VoiceEndOutput,
  VoicePreviewInput,
  VoicePreviewOutput,
  VoiceStartInput,
  VoiceStartOutput,
  VoiceStatus,
} from '@repo/contracts';
import type { VoiceSessions } from './session-link';
import type { VoiceChoicesPort } from './voice-choices';
import type { VoiceClipDesk } from './voice-clip-desk';
import type { VoiceDevices } from './conversation-devices';

// What the App and Operations ask of the Voice call: start it, end it, read it, watch it.
export interface VoiceCallsPort {
  status: () => Promise<VoiceStatus>;
  start: (
    input: VoiceStartInput,
    connection?: AbortSignal,
  ) => Promise<VoiceStartOutput>;
  end: (sessionId?: string) => VoiceEndOutput;
  // An Agent ends its Session's call; refused when the Session has no call.
  hangUp: (sessionId?: string) => VoiceEndOutput;
  watch: (signal: AbortSignal) => AsyncGenerator<VoiceStatus>;
  // Gives the call the Sessions it sends Prompts to and listens to.
  attach: (sessions: VoiceSessions) => void;
  // Settings › Voice: what the person chose and can choose from, and changing it; the next call uses it.
  choices: VoiceChoicesPort;
  // The microphones and speakers of the Apps that can carry a call, read and chosen by Agents and the CLI.
  devices: VoiceDevices;
  // Settings › Voice: one greeting in a voice, played while no call runs.
  preview: (input: VoicePreviewInput) => Promise<VoicePreviewOutput>;
  // The greetings the App recorded from previews; later previews replay them with no provider call.
  previewClips: Pick<VoiceClipDesk, 'get' | 'store'>;
}
