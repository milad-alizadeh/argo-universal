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
  // The band draws along the Composer, not here; the stage shows only its toggle then.
  band: VoiceOrb,
};

// Only the orb is round; the matrix and the wave are wide rounded rectangles, as tall as the orb.
const shapes: Record<VoiceVisualiserKind, { well: string; drawing: string }> = {
  orb: { well: 'size-34 rounded-full', drawing: 'rounded-full' },
  matrix: { well: 'h-34 w-80 rounded-3xl', drawing: 'rounded-2xl' },
  wave: { well: 'h-34 w-80 rounded-3xl', drawing: 'rounded-2xl' },
  band: { well: 'size-34 rounded-full', drawing: 'rounded-full' },
};

type Props = VoiceVisualiserProps & {
  // The visualiser this Device chose; the orb where the stage offers no toggle.
  visualiser?: VoiceVisualiserToggleProps;
};

/*
 * The well every visualiser sits in, sunk into the page as Paper's "Voice stage" draws the orb's. Each stands as tall
 * as the orb, so choosing another never moves the label or the Feed under it.
 */
export function VoiceVisualiser({
  visualiser,
  ...props
}: Props): React.JSX.Element {
  const kind = kindOf(visualiser);

  return (
    <View
      testID="voice-visualiser"
      className={`${shapes[kind].well} bg-muted p-1 shadow-inner`}
    >
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
      className={`overflow-hidden shadow-inner ${shapes[kind].drawing}`}
    >
      <Drawing {...props} />
    </View>
  );
}
