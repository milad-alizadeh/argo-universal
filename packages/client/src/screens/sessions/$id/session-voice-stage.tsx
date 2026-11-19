import type * as React from 'react';
import { VoiceStageReveal, type VoiceStageViewProps } from '#features/voice';

// The orb pinned above the Feed while a call runs in this Session; it comes in as the call starts and leaves as it ends.
export const voiceStage = (props: {
  stage?: VoiceStageViewProps;
}): React.ReactNode => <VoiceStageReveal stage={props.stage} />;
