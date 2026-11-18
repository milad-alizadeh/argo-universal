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

export function createVoiceOperations(
  voice: VoiceCallsPort,
): VoiceImplementations {
  return {
    'voice.status': () => voice.status(),
    'voice.start': (input, connection) => voice.start(input, connection),
    'voice.getSettings': () => voice.settings(),
    'voice.setSettings': (change) => voice.changeSettings(change),
    'voice.end': ({ sessionId }) => Promise.resolve(voice.end(sessionId)),
    'voice.hangUp': ({ sessionId }) => Promise.resolve(voice.hangUp(sessionId)),
  };
}
