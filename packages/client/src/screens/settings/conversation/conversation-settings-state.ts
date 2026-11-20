import { defaultVoiceCallOptions, type VoiceSettings } from '@repo/contracts';
import type { VoiceDetailViewProps } from './conversation-detail-view-props';

const nothing: VoiceSettings = {
  enabled: false,
  provider: null,
  voice: null,
  providers: [],
  voices: [],
  customVoices: [],
  instructions: '',
  options: defaultVoiceCallOptions,
};

// What is chosen and offered; nothing until the Server has answered.
export const settingsOf = (props: VoiceDetailViewProps): VoiceSettings =>
  props.voice.status === 'loaded' ? props.voice.settings : nothing;

export const waiting = (props: VoiceDetailViewProps): boolean =>
  props.voice.status !== 'loaded' || props.saving === true;

export const chosenProvider = (
  settings: VoiceSettings,
): VoiceSettings['providers'][number] | undefined =>
  settings.providers.find(({ id }) => id === settings.provider);
