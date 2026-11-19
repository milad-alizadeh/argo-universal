import type * as React from 'react';
import { VoiceStageView, type VoiceStageViewProps } from '#features/voice';

// The orb pinned above the Feed while a call runs in this Session.
export const voiceStage = (props: {
  stage?: VoiceStageViewProps;
}): React.ReactNode => props.stage && <VoiceStageView {...props.stage} />;
