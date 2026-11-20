import type { CustomVoice, ConversationSettings } from '@repo/contracts';

export interface VoicePickerProps {
  settings: ConversationSettings;
  disabled: boolean;
  onVoiceChange: (voice: string) => void;
  onPreviewVoice: (voice: string) => void;
  // Opens the custom voice form on this voice, or empty to add one.
  onEditVoice: (voice?: CustomVoice) => void;
}

// The voices page, in a popover or pushed: the search, and `close`, which every choice and edit calls first.
export type ConversationPageProps = VoicePickerProps & {
  query: string;
  // Absent where the page's header holds the search.
  onQueryChange?: (query: string) => void;
  close: () => void;
};

export const voicePickerCopy = {
  title: 'Conversation',
  search: 'Search voices',
  custom: 'Your voices',
  add: 'New custom voice…',
  empty: 'No matching voices',
};
