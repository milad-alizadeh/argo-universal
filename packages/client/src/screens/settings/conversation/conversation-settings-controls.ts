import type {
  CustomVoiceInput,
  ConversationOptionsChange,
  ConversationSettingsChange,
} from '@repo/contracts';
import type { ConversationDetailViewProps } from './conversation-detail-view';
import {
  previewOfDraft,
  savedOfDraft,
  type CustomVoicePreview,
} from './custom-voice-draft';

// What the page can ask of the App: change a setting, hear a voice, load the settings again.
export interface ConversationSettingsActions {
  change: (change: ConversationSettingsChange) => void;
  setInstructions: (instructions: string) => void;
  setConversationOptions: (change: ConversationOptionsChange) => void;
  saveCustomVoice: (voice: CustomVoiceInput) => void;
  deleteCustomVoice: (id: string) => void;
  preview: (voice: string, custom?: CustomVoicePreview['custom']) => void;
  retry: () => void;
}

export type ConversationSettingsControls = Pick<
  ConversationDetailViewProps,
  | 'onEnabledChange'
  | 'onProviderChange'
  | 'onVoiceChange'
  | 'onPreviewVoice'
  | 'onInstructionsChange'
  | 'onConversationOptionsChange'
  | 'onSaveCustomVoice'
  | 'onDeleteCustomVoice'
  | 'onPreviewCustomVoice'
  | 'onRetry'
>;

const conversationControls = (
  actions: ConversationSettingsActions,
): Pick<ConversationSettingsControls, 'onVoiceChange' | 'onPreviewVoice'> => ({
  onVoiceChange: (voice) => {
    actions.change({ voice });
    actions.preview(voice);
  },
  onPreviewVoice: (voice) => actions.preview(voice),
});

// A custom voice is saved trimmed, and heard before it is saved as its built-in voice told how to speak.
const customVoiceControls = (
  actions: ConversationSettingsActions,
): Pick<
  ConversationSettingsControls,
  'onSaveCustomVoice' | 'onDeleteCustomVoice' | 'onPreviewCustomVoice'
> => ({
  onSaveCustomVoice: (draft) => actions.saveCustomVoice(savedOfDraft(draft)),
  onDeleteCustomVoice: actions.deleteCustomVoice,
  onPreviewCustomVoice: (draft) => {
    const { voice, custom } = previewOfDraft(draft);
    actions.preview(voice, custom);
  },
});

// The page's controls: a picked voice is kept for the next Conversation and heard at once.
export const controlsOf = (
  actions: ConversationSettingsActions,
): ConversationSettingsControls => ({
  onEnabledChange: (enabled) => actions.change({ enabled }),
  onProviderChange: (provider) => actions.change({ provider }),
  onInstructionsChange: actions.setInstructions,
  onConversationOptionsChange: actions.setConversationOptions,
  onRetry: actions.retry,
  ...conversationControls(actions),
  ...customVoiceControls(actions),
});
