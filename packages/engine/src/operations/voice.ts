import type { Sessions } from '../sessions';
import type { VoiceCallsPort } from '../voice';
import type { OperationImplementations } from './operations';

type VoiceImplementations = Pick<
  OperationImplementations,
  | 'voice.status'
  | 'voice.start'
  | 'voice.end'
  | 'voice.hangUp'
  | 'voice.getSettings'
  | 'voice.setSettings'
>;

// A call starts in its Session, opened first if it is not, as after a Server restart.
export function createVoiceOperations(
  voice: VoiceCallsPort,
  sessions: Pick<Sessions, 'open'>,
): VoiceImplementations {
  return {
    'voice.status': () => voice.status(),
    'voice.start': async (input, connection) => {
      await sessions.open(input.sessionId);

      return voice.start(input, connection);
    },
    'voice.getSettings': () => voice.settings(),
    'voice.setSettings': (change) => voice.changeSettings(change),
    'voice.end': ({ sessionId }) => Promise.resolve(voice.end(sessionId)),
    'voice.hangUp': ({ sessionId }) => Promise.resolve(voice.hangUp(sessionId)),
  };
}
