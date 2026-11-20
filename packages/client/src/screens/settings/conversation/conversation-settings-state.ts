import {
  defaultConversationOptions,
  type ConversationSettings,
} from '@repo/contracts';
import type { ConversationDetailViewProps } from './conversation-detail-view-props';

const nothing: ConversationSettings = {
  enabled: false,
  provider: null,
  voice: null,
  providers: [],
  voices: [],
  customVoices: [],
  instructions: '',
  options: defaultConversationOptions,
};

// What is chosen and offered; nothing until the Server has answered.
export const settingsOf = (
  props: ConversationDetailViewProps,
): ConversationSettings =>
  props.voice.status === 'loaded' ? props.voice.settings : nothing;

export const waiting = (props: ConversationDetailViewProps): boolean =>
  props.voice.status !== 'loaded' || props.saving === true;

export const chosenProvider = (
  settings: ConversationSettings,
): ConversationSettings['providers'][number] | undefined =>
  settings.providers.find(({ id }) => id === settings.provider);
