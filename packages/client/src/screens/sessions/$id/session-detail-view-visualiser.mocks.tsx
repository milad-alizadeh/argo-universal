import type { ComposerVoice } from '#features/composer';
import { VoiceEdgeBand } from '#features/voice';
import { syntheticVoiceAudio } from '../../../../mocks/voice/synthetic-voice-audio';
import type { OpenSessionViewProps } from './session-detail-view';
import {
  connectedHere,
  voiceCallSession,
} from './session-detail-view-voice.mocks';

// Sound with no microphone and no voice, so the orb and the band move as they would on a call.
const audio = syntheticVoiceAudio();

const listening = {
  orb: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

const band = { call: listening, elapsed: '4:12', ...audio };

// The Composer's voice slot with the band along its top edge.
const withBand: ComposerVoice = {
  ...connectedHere,
  edge: <VoiceEdgeBand {...band} />,
};

// A Session on a Voice call with the orb above the Feed, moving as it would on a call.
export const orbCallSession: OpenSessionViewProps = {
  ...voiceCallSession,
  stage: voiceCallSession.stage && {
    ...voiceCallSession.stage,
    levels: audio.levels,
  },
};

/*
 * A Session on a Voice call where this Device chose the band in Settings › Voice: no stage above the Feed, and the
 * call drawn along the Composer's top edge.
 */
export const bandCallSession: OpenSessionViewProps = {
  ...voiceCallSession,
  stage: undefined,
  composer: { ...voiceCallSession.composer, voice: withBand },
};
