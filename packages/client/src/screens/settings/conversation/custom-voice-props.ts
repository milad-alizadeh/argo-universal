import type { CustomVoice, VoiceOption } from '@repo/contracts';
import type { CustomVoiceDraft } from './custom-voice-draft';

// The form is open: on a custom voice to edit, or on none to add one.
export interface CustomVoiceEditor {
  voice?: CustomVoice;
}

export interface CustomVoiceDialogProps {
  editor?: CustomVoiceEditor;
  // The provider's built-in voices, one of which a custom voice speaks with.
  voices: VoiceOption[];
  providerLabel: string;
  // Why the last save or delete failed; the form stays open and says so.
  error?: string;
  onClose: () => void;
  onSave: (draft: CustomVoiceDraft) => void;
  onDelete: (id: string) => void;
  onPreview: (draft: CustomVoiceDraft) => void;
}

export type FormProps = CustomVoiceDialogProps & {
  editor: CustomVoiceEditor;
};
