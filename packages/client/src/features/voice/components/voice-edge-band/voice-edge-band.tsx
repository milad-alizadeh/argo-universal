import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import type { VoiceSpectrum } from '../../types/voice-connection';
import { edgeLookOf, type EdgeCall, type EdgeLook } from './edge-band';
import { EdgeWave } from './edge-wave';

export interface VoiceEdgeBandProps {
  call: EdgeCall;
  // How long the call has run, as the stage's timer reads it.
  elapsed: string;
  spectrum?: () => VoiceSpectrum;
}

type LabelProps = { look: EdgeLook; elapsed: string };

// The timer is regular weight beside the medium label, as Paper sets it; it waits until the call connects.
const Timer = ({ look, elapsed }: LabelProps): React.ReactNode =>
  look.timer && (
    <Text role="secondary" tone="muted">
      {elapsed}
    </Text>
  );

function EdgeLabel(props: LabelProps): React.JSX.Element {
  return (
    <View className="shrink-0 flex-row items-baseline gap-1.25">
      <Text role="badge" tone={props.look.labelTone}>
        {props.look.label}
      </Text>
      <Timer {...props} />
    </View>
  );
}

const bandClass =
  'h-7.5 w-full flex-row items-center gap-3 pl-4 pr-2.5 pt-2.5 wide:px-4.75';

/*
 * Paper's "Composer waveform — B · Edge band": the call drawn as a slim waveform along the Composer card's top edge,
 * above the text box, with its state and timer at the right end. The Composer stays one card, and typing goes on under
 * it throughout.
 */
export function VoiceEdgeBand({
  call,
  elapsed,
  spectrum,
}: VoiceEdgeBandProps): React.JSX.Element {
  const look = edgeLookOf(call);

  return (
    <View testID="voice-edge-band" className={bandClass}>
      <EdgeWave look={look} spectrum={spectrum} />
      <EdgeLabel look={look} elapsed={elapsed} />
    </View>
  );
}
