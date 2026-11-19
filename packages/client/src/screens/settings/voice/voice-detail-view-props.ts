import type { VoiceCallOptionsChange, VoiceSettings } from '@repo/contracts';
import type { VoiceDeviceChoice } from '#features/voice';
import type { CustomVoiceDraft } from './custom-voice-draft';
import type { CustomVoiceEditor } from './custom-voice-props';
import type { VisualiserChoice } from './voice-call-section';
import type { VoiceDevices } from './voice-devices-section';

export type VoiceSettingsLoad =
  | { status: 'loading' | 'error' | 'disconnected' }
  | { status: 'loaded'; settings: VoiceSettings };

// What the page shows: the Server's Voice settings, and this Device's own where it carries a call's sound.
export interface VoiceDetailViewState {
  voice: VoiceSettingsLoad;
  // Only where the App can hold a call; elsewhere there is nothing to choose.
  devices?: VoiceDevices;
  // Only where the App draws a call.
  visualiser?: VisualiserChoice;
  // Only where the App can change the microphone's gain.
  adjustsGain?: boolean;
  // The custom voice form, while it is open.
  editor?: CustomVoiceEditor;
  // Why the last save or delete of a custom voice failed.
  editorError?: string;
  saving?: boolean;
  error?: string;
}

export interface VoiceDetailViewActions {
  onEnabledChange: (enabled: boolean) => void;
  onProviderChange: (provider: string) => void;
  onVoiceChange: (voice: string) => void;
  onPreviewVoice: (voice: string) => void;
  onInstructionsChange: (instructions: string) => void;
  onCallOptionsChange: (change: VoiceCallOptionsChange) => void;
  // Opens the custom voice form, or closes it with nothing.
  onEditorChange: (editor?: CustomVoiceEditor) => void;
  onSaveCustomVoice: (draft: CustomVoiceDraft) => void;
  onDeleteCustomVoice: (id: string) => void;
  onPreviewCustomVoice: (draft: CustomVoiceDraft) => void;
  onDevicesChange?: (change: Partial<VoiceDeviceChoice>) => void;
  onRetry: () => void;
  onBack?: () => void;
}

export type VoiceDetailViewProps = VoiceDetailViewState &
  VoiceDetailViewActions;
