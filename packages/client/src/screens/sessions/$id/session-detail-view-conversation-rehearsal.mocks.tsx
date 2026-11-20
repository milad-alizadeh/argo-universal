import type * as React from 'react';
import { createElement, useEffect, useState } from 'react';
import type { ComposerConversation, ComposerConversationMutes } from '#features/composer';
import { ConversationEdgeBand, conversationPlaceholder } from '#features/conversation';
import { syntheticVoiceAudio } from '../../../../mocks/conversation/synthetic-voice-audio';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';

// Where the rehearsed call is: none, connecting, or connected.
type RehearsedCall = 'none' | 'connecting' | 'connected';

// How long the rehearsed call takes to connect, about as long as a Conversation provider does.
export const rehearsedConnectMilliseconds = 1800;

const idleComposer = idleSession.composer;

// Sound with no microphone and no voice, so the band moves as it would on a call.
const { spectrum } = syntheticVoiceAudio();

const bandFor = (call: Exclude<RehearsedCall, 'none'>): React.ReactNode =>
  createElement(ConversationEdgeBand, {
    call: {
      state: call === 'connecting' ? 'none' : 'listening',
      trouble: null,
      microphoneMuted: false,
    },
    elapsed: '0:00',
    spectrum,
  });

type Mutes = { microphone: boolean; speaker: boolean };

interface Rehearsal {
  call: RehearsedCall;
  setCall: (call: RehearsedCall) => void;
  mutes: Mutes;
  setMutes: (mutes: Mutes) => void;
}

const mutesOf = ({ mutes, setMutes }: Rehearsal): ComposerConversationMutes => ({
  ...mutes,
  onMicrophone: () => setMutes({ ...mutes, microphone: !mutes.microphone }),
  onSpeaker: () => setMutes({ ...mutes, speaker: !mutes.speaker }),
});

function conversationOf(rehearsal: Rehearsal): ComposerConversation {
  const { call, setCall } = rehearsal;
  const onEnd = (): void => setCall('none');

  if (call === 'none') {
    return { kind: 'start', onStart: () => setCall('connecting') };
  }

  return call === 'connecting'
    ? { kind: 'connecting', onEnd, edge: bandFor('connecting') }
    : {
        kind: 'connected',
        onEnd,
        mutes: mutesOf(rehearsal),
        edge: bandFor('connected'),
      };
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
 * A Session page whose Conversation the person starts and ends with the Composer's own buttons: the voice button starts
 * it, it connects a moment later, and End takes it away, so the band's entrance and exit can be watched.
 */
export function ConversationRehearsal(): React.JSX.Element {
  const [call, setCall] = useState<RehearsedCall>('none');
  const [mutes, setMutes] = useState({ microphone: false, speaker: false });
  useConnectAfterStart(call, setCall);
  const voice = conversationOf({ call, setCall, mutes, setMutes });
  const placeholder = conversationPlaceholder(voice) ?? idleComposer.placeholder;

  return (
    <FramedSessionPreview
      state="open"
      {...idleSession}
      composer={{ ...idleComposer, placeholder, voice }}
    />
  );
}
