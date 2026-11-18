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

// The Composer's voice state for one Session, drawn from the Server's status.
export const composerVoice = (
  status: VoiceStatus,
  sessionId: string,
  handlers: Pick<ComposerVoice, 'onStart' | 'onEnd'>,
): ComposerVoice => ({
  usable: voiceOffered(status),
  call: callHere(status.call, sessionId),
  ...handlers,
});
