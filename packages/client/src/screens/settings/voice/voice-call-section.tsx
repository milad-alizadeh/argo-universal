import type { VoiceCallOptions, VoiceCallOptionsChange } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ReactElement } from 'react';
import type { VoiceVisualiserKind } from '#features/voice';
import { idleChoices } from './voice-call-options';
import { HeldSliderRow, HeldTextRow } from './voice-held-rows';

// The visualiser this Device draws a call with, and how to choose another.
export interface VisualiserChoice {
  kind: VoiceVisualiserKind;
  onChange: (kind: VoiceVisualiserKind) => void;
}

export interface CallSectionProps {
  // Volume and gain are set where the App plays a call's sound on a desktop window; a phone has neither row.
  audio: boolean;
  options: VoiceCallOptions;
  disabled: boolean;
  // Only where this App carries a call's sound and can change the microphone's gain.
  adjustsGain?: boolean;
  // Only where this App draws a call.
  visualiser?: VisualiserChoice;
  onChange: (change: VoiceCallOptionsChange) => void;
}

const loudest = 100;

const strongestGain = 200;

const visualiserOptions = [
  { value: 'orb', label: 'Orb' },
  { value: 'band', label: 'Band' },
] satisfies { value: VoiceVisualiserKind; label: string }[];

const isKind = (value: string): value is VoiceVisualiserKind =>
  visualiserOptions.some((option) => option.value === value);

const footers = {
  gain: 'Volume and gain change a running call at once; the rest apply from the next call.',
  volume:
    'Volume changes a running call at once; the rest apply from the next call.',
  none: 'These apply from the next call.',
};

const footerOf = (props: CallSectionProps): string =>
  footers[soundRowsOf(props)];

// Which of volume and gain the section shows.
const soundRowsOf = (props: CallSectionProps): keyof typeof footers => {
  if (!props.audio) return 'none';

  return props.adjustsGain ? 'gain' : 'volume';
};

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

const volumeRow = (props: CallSectionProps): ReactElement | null =>
  props.audio ? (
    <HeldSliderRow
      key="volume"
      title="Volume"
      value={props.options.volume}
      max={loudest}
      disabled={props.disabled}
      onCommit={(volume) => props.onChange({ volume })}
    />
  ) : null;

const gainRow = (props: CallSectionProps): ReactElement | null =>
  soundRowsOf(props) === 'gain' ? (
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
 * How every call behaves (Paper "1 · Page", option A): the filler line, the idle timeout, how this Device draws the
 * call, the volume and gain, and the opening note. Called, not rendered, like the page's other sections.
 */
export const callSection = (props: CallSectionProps): ReactElement => (
  <FieldGroup.Section key="call" title="Call" footer={footerOf(props)}>
    {fillerRow(props)}
    {idleRow(props)}
    {visualiserRow(props.visualiser)}
    {volumeRow(props)}
    {gainRow(props)}
    {openingRow(props)}
  </FieldGroup.Section>
);
