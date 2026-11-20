import type { VoiceCallOptions, VoiceCallOptionsChange } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import { idleChoices } from './voice-call-options';
import { HeldSliderRow, HeldTextRow } from './voice-held-rows';

export interface CallSectionProps {
  options: VoiceCallOptions;
  disabled: boolean;
  // Only where this App carries a call's sound and can change the microphone's gain.
  adjustsGain?: boolean;
  onChange: (change: VoiceCallOptionsChange) => void;
}

const loudest = 100;

const strongestGain = 200;

const footerOf = (props: CallSectionProps): string =>
  props.adjustsGain
    ? 'Volume and gain change a running call at once; the rest apply from the next call.'
    : 'Volume changes a running call at once; the rest apply from the next call.';

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
    title="End a silent call after"
    presentation="menu"
    value={String(props.options.idleSeconds)}
    options={idleChoices(props.options.idleSeconds)}
    disabled={props.disabled}
    onValueChange={(seconds) =>
      props.onChange({ idleSeconds: Number(seconds) })
    }
  />
);

const volumeRow = (props: CallSectionProps): ReactElement => (
  <HeldSliderRow
    key="volume"
    title="Volume"
    value={props.options.volume}
    max={loudest}
    disabled={props.disabled}
    onCommit={(volume) => props.onChange({ volume })}
  />
);

const gainRow = (props: CallSectionProps): ReactElement | null =>
  props.adjustsGain ? (
    <HeldSliderRow
      key="gain"
      title="Microphone gain"
      value={props.options.microphoneGain}
      max={strongestGain}
      disabled={props.disabled}
      onCommit={(microphoneGain) => props.onChange({ microphoneGain })}
    />
  ) : null;

const openingRow = (props: CallSectionProps): ReactElement => (
  <HeldTextRow
    key="opening"
    title="Opening note"
    placeholder="What the voice knows when the call starts"
    value={props.options.opening}
    disabled={props.disabled}
    onCommit={(opening) => props.onChange({ opening })}
  />
);

/*
 * How every call behaves (Paper "1 · Page", option A): the filler line, the idle timeout, the volume and gain, and the opening note. Called, not rendered, like the page's other sections.
 */
export const callSection = (props: CallSectionProps): ReactElement => (
  <FieldGroup.Section key="call" title="Call" footer={footerOf(props)}>
    {fillerRow(props)}
    {idleRow(props)}
    {volumeRow(props)}
    {gainRow(props)}
    {openingRow(props)}
  </FieldGroup.Section>
);
