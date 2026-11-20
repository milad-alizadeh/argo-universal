import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import type { ConversationDetailViewProps } from './conversation-detail-view-props';
import { providerReason, providerRow } from './conversation-provider-row';
import {
  chosenProvider,
  settingsOf,
  waiting,
} from './conversation-settings-state';
import { CustomVoiceDialog } from './custom-voice-dialog';
import { HeldTextRow } from './voice-held-rows';
import { VoicePicker } from './voice-picker';

// While the chosen provider cannot be used, its reason takes the footnote: no call starts until it is fixed.
const conversationFooter = (props: ConversationDetailViewProps): string =>
  providerReason(props) ??
  'The next Conversation uses this voice and these instructions.';

// Who speaks on the next call, and what it is told: the provider, the voice, the instructions and the opening note.
export const conversationSection = (
  props: ConversationDetailViewProps,
): React.JSX.Element => (
  <FieldGroup.Section
    key="voice"
    title="Voice and instructions"
    footer={conversationFooter(props)}
  >
    {providerRow(props)}
    {pickerRow(props)}
    {instructionsRow(props)}
    {openingRow(props)}
  </FieldGroup.Section>
);

const openingRow = (props: ConversationDetailViewProps): React.JSX.Element => (
  <HeldTextRow
    key="opening"
    title="Opening note"
    placeholder="What the voice knows when the Conversation starts"
    value={settingsOf(props).options.opening}
    disabled={waiting(props)}
    onCommit={(opening) => props.onConversationOptionsChange({ opening })}
  />
);

const pickerRow = (props: ConversationDetailViewProps): React.JSX.Element => (
  <VoicePicker
    key="voice"
    settings={settingsOf(props)}
    disabled={waiting(props)}
    onVoiceChange={props.onVoiceChange}
    onPreviewVoice={props.onPreviewVoice}
    onEditVoice={(voice) => props.onEditorChange({ voice })}
  />
);

const instructionsRow = (
  props: ConversationDetailViewProps,
): React.JSX.Element => (
  <HeldTextRow
    key="instructions"
    title="Instructions for every Conversation"
    placeholder="Call me Sam. Keep answers short."
    value={settingsOf(props).instructions}
    disabled={waiting(props)}
    onCommit={props.onInstructionsChange}
  />
);

// The custom voice form, over the page while it is open.
export function EditorDialog(
  props: ConversationDetailViewProps,
): React.JSX.Element {
  const settings = settingsOf(props);

  return <CustomVoiceDialog {...dialogProps(props, settings)} />;
}

const dialogProps = (
  props: ConversationDetailViewProps,
  settings: ReturnType<typeof settingsOf>,
): React.ComponentProps<typeof CustomVoiceDialog> => ({
  editor: props.editor,
  voices: settings.voices,
  providerLabel: chosenProvider(settings)?.label ?? 'The provider',
  error: props.editorError,
  onClose: () => props.onEditorChange(),
  onSave: props.onSaveCustomVoice,
  onDelete: props.onDeleteCustomVoice,
  onPreview: props.onPreviewCustomVoice,
});
