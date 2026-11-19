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
  | 'voice.listVoices'
  | 'voice.saveCustomVoice'
  | 'voice.setVoice'
  | 'voice.deleteCustomVoice'
  | 'voice.setInstructions'
  | 'voice.setCallOptions'
  | 'voice.preview'
  | 'voice.getPreviewClip'
  | 'voice.storePreviewClip'
  | 'voice.listDevices'
  | 'voice.chooseDevices'
>;

// A call starts in its Session, opened first if it is not, as after a Server restart.
const startInOpenSession =
  (
    voice: VoiceCallsPort,
    sessions: Pick<Sessions, 'open'>,
  ): VoiceImplementations['voice.start'] =>
  async (input, connection) => {
    await sessions.open(input.sessionId);

    return voice.start(input, connection);
  };

type ChoiceImplementations = Pick<
  VoiceImplementations,
  | 'voice.getSettings'
  | 'voice.setSettings'
  | 'voice.listVoices'
  | 'voice.saveCustomVoice'
  | 'voice.setVoice'
  | 'voice.deleteCustomVoice'
  | 'voice.setInstructions'
  | 'voice.setCallOptions'
>;

// What the next call speaks with and is told.
const choiceOperations = ({
  choices,
}: VoiceCallsPort): ChoiceImplementations => ({
  'voice.getSettings': () => choices.settings(),
  'voice.setSettings': (change) => choices.change(change),
  'voice.listVoices': () => choices.voices(),
  'voice.setVoice': ({ voice }) => choices.change({ voice }),
  'voice.saveCustomVoice': (input) => choices.saveCustomVoice(input),
  'voice.deleteCustomVoice': ({ id }) => choices.deleteCustomVoice(id),
  'voice.setInstructions': ({ instructions }) =>
    choices.setInstructions(instructions),
  'voice.setCallOptions': (change) => choices.setCallOptions(change),
});

// The microphone and speaker of the App a call uses.
const deviceOperations = ({
  devices,
}: VoiceCallsPort): Pick<
  VoiceImplementations,
  'voice.listDevices' | 'voice.chooseDevices'
> => ({
  'voice.listDevices': () => Promise.resolve(devices.list()),
  'voice.chooseDevices': (change) => Promise.resolve(devices.choose(change)),
});

// The greetings the App recorded from previews, and keeping them.
const clipOperations = ({
  previewClips,
}: VoiceCallsPort): Pick<
  VoiceImplementations,
  'voice.getPreviewClip' | 'voice.storePreviewClip'
> => ({
  'voice.getPreviewClip': (input) => previewClips.get(input),
  'voice.storePreviewClip': (input) => previewClips.store(input),
});

export function createVoiceOperations(
  voice: VoiceCallsPort,
  sessions: Pick<Sessions, 'open'>,
): VoiceImplementations {
  return {
    'voice.status': () => voice.status(),
    'voice.start': startInOpenSession(voice, sessions),
    'voice.preview': (input) => voice.preview(input),
    'voice.end': ({ sessionId }) => Promise.resolve(voice.end(sessionId)),
    'voice.hangUp': ({ sessionId }) => Promise.resolve(voice.hangUp(sessionId)),
    ...choiceOperations(voice),
    ...deviceOperations(voice),
    ...clipOperations(voice),
  };
}
