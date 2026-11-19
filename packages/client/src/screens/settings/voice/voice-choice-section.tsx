import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { CustomVoiceDialog } from './custom-voice-dialog';
import type { VoiceDetailViewProps } from './voice-detail-view-props';
import { HeldTextRow } from './voice-held-rows';
import { VoicePicker } from './voice-picker';
import { chosenProvider, settingsOf, waiting } from './voice-settings-state';

const voiceFooter =
  "The next call speaks with this voice and is told these instructions after Argo's own.";

// The voice the next call speaks with, and what every call is told after Argo's own instructions.
export const voiceSection = (
  props: VoiceDetailViewProps,
): React.JSX.Element => (
  <FieldGroup.Section key="voice" footer={voiceFooter}>
    {pickerRow(props)}
    {instructionsRow(props)}
  </FieldGroup.Section>
);

const pickerRow = (props: VoiceDetailViewProps): React.JSX.Element => (
  <VoicePicker
    key="voice"
    settings={settingsOf(props)}
    disabled={waiting(props)}
    onVoiceChange={props.onVoiceChange}
    onPreviewVoice={props.onPreviewVoice}
    onEditVoice={(voice) => props.onEditorChange({ voice })}
  />
);

const instructionsRow = (props: VoiceDetailViewProps): React.JSX.Element => (
  <HeldTextRow
    key="instructions"
    title="Instructions for every call"
    placeholder="Call me Sam. Keep answers short."
    value={settingsOf(props).instructions}
    disabled={waiting(props)}
    onCommit={props.onInstructionsChange}
  />
);

// The custom voice form, over the page while it is open.
export function EditorDialog(props: VoiceDetailViewProps): React.JSX.Element {
  const settings = settingsOf(props);

  return (
    <CustomVoiceDialog
      editor={props.editor}
      voices={settings.voices}
      providerLabel={chosenProvider(settings)?.label ?? 'The provider'}
      error={props.editorError}
      onClose={() => props.onEditorChange()}
      onSave={props.onSaveCustomVoice}
      onDelete={props.onDeleteCustomVoice}
      onPreview={props.onPreviewCustomVoice}
    />
  );
}
