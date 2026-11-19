import type * as React from 'react';
import { VoiceOrb } from '../voice-orb/voice-orb';
import type { VoiceVisualiserProps } from './voice-visualiser-props';

/*
 * A phone carries no Voice call's audio yet and has no canvas to draw on, so it falls back to the orb. The web and
 * desktop drawing is `voice-matrix.web.tsx`.
 */
export function VoiceMatrix({
  state,
  levels,
}: VoiceVisualiserProps): React.JSX.Element {
  return <VoiceOrb state={state} levels={levels} />;
}
