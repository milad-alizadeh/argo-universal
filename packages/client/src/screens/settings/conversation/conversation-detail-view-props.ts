import type {
  ConversationOptionsChange,
  ConversationSettings,
} from '@repo/contracts';
import type {
  DeviceMetersState,
  ConversationDeviceChoice,
} from '#features/conversation';
import type { ConversationDevices } from './conversation-devices-section';
import type { CustomVoiceDraft } from './custom-voice-draft';
import type { CustomVoiceEditor } from './custom-voice-props';

export type ConversationSettingsLoad =
  | { status: 'loading' | 'error' | 'disconnected' }
  | { status: 'loaded'; settings: ConversationSettings };

// What the page shows: the Server's Conversation settings, and this Device's own where it carries a Conversation's sound.
export interface ConversationDetailViewState {
  voice: ConversationSettingsLoad;
  // Only where the App can hold a Conversation; elsewhere there is nothing to choose.
  devices?: ConversationDevices;
  // The microphone's and speaker's levels and the speaker's test sound, beside the devices (Paper "Option D").
  meters?: DeviceMetersState;
  // Only where the App can change the microphone's gain.
  adjustsGain?: boolean;
  // The custom voice form, while it is open.
  editor?: CustomVoiceEditor;
  // Why the last save or delete of a custom voice failed.
  editorError?: string;
  saving?: boolean;
  error?: string;
}

export interface ConversationDetailViewActions {
  onEnabledChange: (enabled: boolean) => void;
  onProviderChange: (provider: string) => void;
  onVoiceChange: (voice: string) => void;
  onPreviewVoice: (voice: string) => void;
  onInstructionsChange: (instructions: string) => void;
  onConversationOptionsChange: (change: ConversationOptionsChange) => void;
  // Opens the custom voice form, or closes it with nothing.
  onEditorChange: (editor?: CustomVoiceEditor) => void;
  onSaveCustomVoice: (draft: CustomVoiceDraft) => void;
  onDeleteCustomVoice: (id: string) => void;
  onPreviewCustomVoice: (draft: CustomVoiceDraft) => void;
  onDevicesChange?: (change: Partial<ConversationDeviceChoice>) => void;
  onRetry: () => void;
  onBack?: () => void;
}

export type ConversationDetailViewProps = ConversationDetailViewState &
  ConversationDetailViewActions;
