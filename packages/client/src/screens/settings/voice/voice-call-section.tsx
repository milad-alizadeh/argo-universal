import type { VoiceCallOptions, VoiceCallOptionsChange } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import type { VoiceVisualiserKind } from '#features/voice';
import { idleChoices } from './voice-call-options';

// The visualiser this Device draws a call with, and how to choose another.
export interface VisualiserChoice {
  kind: VoiceVisualiserKind;
  onChange: (kind: VoiceVisualiserKind) => void;
}

export interface CallSectionProps {
  options: VoiceCallOptions;
  disabled: boolean;
  // Only where this App draws a call.
  visualiser?: VisualiserChoice;
  onChange: (change: VoiceCallOptionsChange) => void;
}

const visualiserOptions = [
  { value: 'orb', label: 'Orb' },
  { value: 'band', label: 'Band' },
] satisfies { value: VoiceVisualiserKind; label: string }[];

const isKind = (value: string): value is VoiceVisualiserKind =>
  visualiserOptions.some((option) => option.value === value);

const fillerRow = (props: CallSectionProps): ReactElement => (
  <FieldGroup.Toggle
    key="filler"
    title="Say a short line when handing work over"
    value={props.options.filler}
    disabled={props.disabled}
    onValueChange={(filler) => props.onChange({ filler })}
  />
);

const idleRow = (props: CallSectionProps): ReactElement => (
  <FieldGroup.Picker
    key="idle"
    title="End a silent Conversation after"
    presentation="menu"
    value={String(props.options.idleSeconds)}
    options={idleChoices(props.options.idleSeconds)}
    disabled={props.disabled}
    onValueChange={(seconds) =>
      props.onChange({ idleSeconds: Number(seconds) })
    }
  />
);

// Kept on this Device, as its microphone and speaker are; the band draws along the Composer in place of the orb.
const visualiserRow = (
  visualiser: VisualiserChoice | undefined,
): ReactElement | null =>
  visualiser ? (
    <FieldGroup.Picker
      key="visualiser"
      title="Visualiser"
      presentation="menu"
      value={visualiser.kind}
      options={visualiserOptions}
      onValueChange={(kind) => isKind(kind) && visualiser.onChange(kind)}
    />
  ) : null;

/*
 * How every call behaves: the filler line, the idle timeout and how this Device draws the call. Called, not rendered,
 * like the page's other sections.
 */
export const callSection = (props: CallSectionProps): ReactElement => (
  <FieldGroup.Section
    key="call"
    title="Call behaviour"
    footer="These apply from the next Conversation."
  >
    {fillerRow(props)}
    {idleRow(props)}
    {visualiserRow(props.visualiser)}
  </FieldGroup.Section>
);
