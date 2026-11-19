import type * as React from 'react';
import { View } from 'react-native';
import { VoiceOrb } from '../voice-orb/voice-orb';
import { VoiceMatrix } from './voice-matrix';
import type { VoiceVisualiserKind } from './voice-visualiser-kind';
import type { VoiceVisualiserProps } from './voice-visualiser-props';
import {
  kindOf,
  type VoiceVisualiserToggleProps,
} from './voice-visualiser-toggle';
import { VoiceWave } from './voice-wave';

const drawings: Record<
  VoiceVisualiserKind,
  (props: VoiceVisualiserProps) => React.JSX.Element
> = {
  orb: VoiceOrb,
  matrix: VoiceMatrix,
  wave: VoiceWave,
};

const wellClass = 'size-34 rounded-full bg-muted p-1 shadow-inner';

type Props = VoiceVisualiserProps & {
  // The visualiser this Device chose; the orb where the stage offers no toggle.
  visualiser?: VoiceVisualiserToggleProps;
};

/*
 * The well every visualiser sits in, sunk into the page as Paper's "Voice stage" draws the orb's. Each visualiser is
 * the orb's size, so choosing another never moves the label or the Feed under it.
 */
export function VoiceVisualiser({
  visualiser,
  ...props
}: Props): React.JSX.Element {
  const kind = kindOf(visualiser);

  return (
    <View testID="voice-visualiser" className={wellClass}>
      <Drawn kind={kind} {...props} />
    </View>
  );
}

function Drawn({
  kind,
  ...props
}: VoiceVisualiserProps & { kind: VoiceVisualiserKind }): React.JSX.Element {
  const Drawing = drawings[kind];

  return (
    <View
      testID={`voice-visualiser-${kind}`}
      className="overflow-hidden rounded-full shadow-inner"
    >
      <Drawing {...props} />
    </View>
  );
}
