import { fn } from 'storybook/test';
import type { VoiceDetailViewActions } from './voice-detail-view-props';

// A spy for every action the Voice page takes, for its test stories.
export const voiceDetailSpies = (): VoiceDetailViewActions => ({
  onEnabledChange: fn(),
  onProviderChange: fn(),
  onVoiceChange: fn(),
  onPreviewVoice: fn(),
  onInstructionsChange: fn(),
  onCallOptionsChange: fn(),
  onEditorChange: fn(),
  onSaveCustomVoice: fn(),
  onDeleteCustomVoice: fn(),
  onPreviewCustomVoice: fn(),
  onDevicesChange: fn(),
  onRetry: fn(),
});
