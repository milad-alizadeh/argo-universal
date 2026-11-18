import type { VoiceStatus } from '@repo/contracts';
import type { ComposerVoice, ComposerVoiceCall } from '#features/composer';

// Where the call is, as this Session's Composer sees it.
function callHere(
  call: VoiceStatus['call'],
  sessionId: string,
): ComposerVoiceCall {
  if (!call) return 'none';

  return call.sessionId === sessionId ? call.status : 'elsewhere';
}

// Whether the Composer offers the voice button: Voice calls are on and the Voice provider can start one.
const voiceOffered = (status: VoiceStatus): boolean =>
  status.enabled && status.availability.usable;

type Handlers = Pick<ComposerVoice, 'onStart' | 'onEnd'> &
  Partial<Pick<ComposerVoice, 'mutes' | 'elsewhere'>>;

// The mute buttons belong to the connected call here; the pointer to the call in another Session.
const placedAt = (
  call: ComposerVoice['call'],
  { mutes, elsewhere }: Handlers,
): Pick<ComposerVoice, 'mutes' | 'elsewhere'> => ({
  mutes: call === 'connected' ? mutes : undefined,
  elsewhere: call === 'elsewhere' ? elsewhere : undefined,
});

// The Composer's voice state for one Session, drawn from the Server's status.
export const composerVoice = (
  status: VoiceStatus,
  sessionId: string,
  handlers: Handlers,
): ComposerVoice => {
  const call = callHere(status.call, sessionId);

  return {
    usable: voiceOffered(status),
    call,
    onStart: handlers.onStart,
    onEnd: handlers.onEnd,
    ...placedAt(call, handlers),
  };
};
