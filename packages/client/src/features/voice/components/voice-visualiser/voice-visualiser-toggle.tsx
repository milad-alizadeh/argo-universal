import { SegmentedControl } from '@repo/kit/primitives/controls/segmented-control';
import type * as React from 'react';
import { View } from 'react-native';
import {
  defaultVisualiser,
  voiceVisualiserKind,
  type VoiceVisualiserKind,
} from './voice-visualiser-kind';

export interface VoiceVisualiserToggleProps {
  kind: VoiceVisualiserKind;
  onChange: (kind: VoiceVisualiserKind) => void;
}

const options = [
  { value: 'orb', label: 'Orb' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'wave', label: 'Wave' },
  { value: 'band', label: 'Band' },
] satisfies { value: VoiceVisualiserKind; label: string }[];

// The visualiser the stage draws: the one chosen, or the orb where there is no toggle.
export const kindOf = (
  toggle: VoiceVisualiserToggleProps | undefined,
): VoiceVisualiserKind => toggle?.kind ?? defaultVisualiser;

/*
 * Switches what draws the call: the orb, the LED matrix, the waveform or the Composer's band, in four equal segments as
 * wide as the matrix and the wave. The choice stays on this Device. Nothing shows where the stage offers no toggle.
 */
export function VoiceVisualiserToggle({
  toggle,
}: {
  toggle: VoiceVisualiserToggleProps | undefined;
}): React.JSX.Element | null {
  return toggle ? <Segments {...toggle} /> : null;
}

function Segments({
  kind,
  onChange,
}: VoiceVisualiserToggleProps): React.JSX.Element {
  return (
    <View className="w-80 max-w-full self-center">
      <SegmentedControl
        label="Visualiser"
        options={options}
        value={kind}
        onValueChange={(value) => onChange(voiceVisualiserKind.parse(value))}
      />
    </View>
  );
}

/*
 * The stage while the band along the Composer draws the call: only the toggle, where the full stage puts it, evenly
 * padded, so the Feed keeps nearly all its height and the person can still switch back.
 */
export function BandStage({
  toggle,
}: {
  toggle: VoiceVisualiserToggleProps | undefined;
}): React.JSX.Element {
  return (
    <View testID="voice-stage" className="w-full shrink-0 items-center py-3">
      <VoiceVisualiserToggle toggle={toggle} />
    </View>
  );
}
