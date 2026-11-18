import type { VoiceCallsPort } from '../voice';
import type { OperationImplementations } from './operations';

type VoiceImplementations = Pick<
  OperationImplementations,
  'voice.status' | 'voice.start' | 'voice.end'
>;

export function createVoiceOperations(
  voice: VoiceCallsPort,
): VoiceImplementations {
  return {
    'voice.status': () => voice.status(),
    'voice.start': (input, connection) => voice.start(input, connection),
    'voice.end': ({ sessionId }) => Promise.resolve(voice.end(sessionId)),
  };
}
