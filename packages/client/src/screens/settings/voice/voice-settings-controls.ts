import type { VoiceSettingsChange } from '@repo/contracts';
import type { VoiceDetailViewProps } from './voice-detail-view';

// What the page can ask of the App: change a setting, hear a voice, load the settings again.
export interface VoiceSettingsActions {
  change: (change: VoiceSettingsChange) => void;
  preview: (voice: string) => void;
  retry: () => void;
}

export type VoiceSettingsControls = Pick<
  VoiceDetailViewProps,
  'onEnabledChange' | 'onProviderChange' | 'onVoiceChange' | 'onRetry'
>;

// The page's controls: a picked voice is kept for the next call and heard at once.
export const controlsOf = (
  actions: VoiceSettingsActions,
): VoiceSettingsControls => ({
  onEnabledChange: (enabled) => actions.change({ enabled }),
  onProviderChange: (provider) => actions.change({ provider }),
  onVoiceChange: (voice) => {
    actions.change({ voice });
    actions.preview(voice);
  },
  onRetry: actions.retry,
});
