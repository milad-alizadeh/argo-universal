import type * as React from 'react';
import { useEffect, useState } from 'react';
import type { ComposerVoice, ComposerVoiceMutes } from '#features/composer';
import {
  voiceLabel,
  voicePlaceholder,
  type VoiceStageViewProps,
} from '#features/voice';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';

// Where the rehearsed call is: none, connecting, or connected.
type RehearsedCall = 'none' | 'connecting' | 'connected';

// How long the rehearsed call takes to connect, about as long as a Voice provider does.
export const rehearsedConnectMilliseconds = 1800;

const startedAt = '2026-11-18T10:00:00.000Z';

const idleComposer = idleSession.composer;

const stages: Record<RehearsedCall, VoiceStageViewProps | undefined> = {
  none: undefined,
  connecting: {
    state: 'none',
    label: voiceLabel({ orb: 'none', trouble: null, startedAt: null }, 0),
  },
  connected: {
    state: 'listening',
    label: voiceLabel(
      { orb: 'listening', trouble: null, startedAt },
      Date.parse(startedAt),
    ),
  },
};

type Mutes = { microphone: boolean; speaker: boolean };

interface Rehearsal {
  call: RehearsedCall;
  setCall: (call: RehearsedCall) => void;
  mutes: Mutes;
  setMutes: (mutes: Mutes) => void;
}

const mutesOf = ({ mutes, setMutes }: Rehearsal): ComposerVoiceMutes => ({
  ...mutes,
  onMicrophone: () => setMutes({ ...mutes, microphone: !mutes.microphone }),
  onSpeaker: () => setMutes({ ...mutes, speaker: !mutes.speaker }),
});

function voiceOf(rehearsal: Rehearsal): ComposerVoice {
  const { call, setCall } = rehearsal;
  const onEnd = (): void => setCall('none');

  if (call === 'none') {
    return { kind: 'start', onStart: () => setCall('connecting') };
  }

  return call === 'connecting'
    ? { kind: 'connecting', onEnd }
    : { kind: 'connected', onEnd, mutes: mutesOf(rehearsal) };
}

// The call connects a moment after it starts, as the Server reports it; ending it first cancels that.
function useConnectAfterStart(
  call: RehearsedCall,
  setCall: (call: RehearsedCall) => void,
): void {
  useEffect(() => {
    if (call !== 'connecting') return;

    const timer = setTimeout(
      () => setCall('connected'),
      rehearsedConnectMilliseconds,
    );

    return (): void => clearTimeout(timer);
  }, [call, setCall]);
}

/*
 * A Session page whose Voice call the person starts and ends with the Composer's own buttons: the voice button starts
 * it, it connects a moment later, and End takes it away, so the stage's entrance and exit can be watched.
 */
export function VoiceCallRehearsal(): React.JSX.Element {
  const [call, setCall] = useState<RehearsedCall>('none');
  const [mutes, setMutes] = useState({ microphone: false, speaker: false });
  useConnectAfterStart(call, setCall);
  const voice = voiceOf({ call, setCall, mutes, setMutes });
  const placeholder = voicePlaceholder(voice) ?? idleComposer.placeholder;

  return (
    <FramedSessionPreview
      state="open"
      {...idleSession}
      stage={stages[call]}
      composer={{ ...idleComposer, placeholder, voice }}
    />
  );
}
