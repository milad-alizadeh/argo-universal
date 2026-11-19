import type * as React from 'react';
import { useState } from 'react';
import type { ComposerVoice } from '#features/composer';
import { VoiceEdgeBand, type VoiceStageViewProps } from '#features/voice';
import { syntheticVoiceAudio } from '../../../../mocks/voice/synthetic-voice-audio';
import type { OpenSessionViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  connectedHere,
  voiceCallSession,
} from './session-detail-view-voice.mocks';

type Kind = NonNullable<VoiceStageViewProps['visualiser']>['kind'];

// Sound with no microphone and no voice, so the stage and the band move as they would on a call.
const audio = syntheticVoiceAudio();

const listening = {
  orb: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

const band = { call: listening, elapsed: '4:12', ...audio };

// The Composer's voice slot, with the band along its top edge when Band is chosen.
const voiceFor = (kind: Kind): ComposerVoice =>
  kind === 'band'
    ? { ...connectedHere, edge: <VoiceEdgeBand {...band} /> }
    : connectedHere;

// The call's page as the App draws it for one choice: the stage, and the Composer under the Feed.
function sessionFor(
  kind: Kind,
  onChange: (next: Kind) => void,
): OpenSessionViewProps {
  const stage = voiceCallSession.stage;

  return {
    ...voiceCallSession,
    stage: stage && { ...stage, ...audio, visualiser: { kind, onChange } },
    composer: { ...voiceCallSession.composer, voice: voiceFor(kind) },
  };
}

/*
 * A Session on a Voice call with the visualiser toggle live: choosing Band empties the stage but for the toggle and
 * draws the call along the Composer's top edge; the others draw it above the Feed.
 */
export function VisualiserChoosingPreview(props: {
  first: Kind;
  feed?: OpenSessionViewProps['feed'];
}): React.JSX.Element {
  const [kind, setKind] = useState(props.first);
  const session = sessionFor(kind, setKind);
  const feed = props.feed ?? session.feed;

  return <FramedSessionPreview state="open" {...session} feed={feed} />;
}
