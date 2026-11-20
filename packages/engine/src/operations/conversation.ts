import type { ConversationsPort } from '../conversation';
import type { Sessions } from '../sessions';
import type { OperationImplementations } from './operations';

type ConversationImplementations = Pick<
  OperationImplementations,
  | 'conversation.status'
  | 'conversation.start'
  | 'conversation.end'
  | 'conversation.hangUp'
  | 'conversation.getSettings'
  | 'conversation.setSettings'
  | 'voice.listVoices'
  | 'voice.saveCustomVoice'
  | 'voice.setVoice'
  | 'voice.deleteCustomVoice'
  | 'conversation.setInstructions'
  | 'conversation.setOptions'
  | 'voice.preview'
  | 'voice.getPreviewClip'
  | 'voice.storePreviewClip'
  | 'conversation.listDevices'
  | 'conversation.chooseDevices'
>;

// A call starts in its Session, opened first if it is not, as after a Server restart.
const startInOpenSession =
  (
    conversation: ConversationsPort,
    sessions: Pick<Sessions, 'open'>,
  ): ConversationImplementations['conversation.start'] =>
  async (input, connection) => {
    await sessions.open(input.sessionId);

    return conversation.start(input, connection);
  };

type ChoiceImplementations = Pick<
  ConversationImplementations,
  | 'conversation.getSettings'
  | 'conversation.setSettings'
  | 'voice.listVoices'
  | 'voice.saveCustomVoice'
  | 'voice.setVoice'
  | 'voice.deleteCustomVoice'
  | 'conversation.setInstructions'
  | 'conversation.setOptions'
>;

// What the next call speaks with and is told.
const choiceOperations = ({
  choices,
}: ConversationsPort): ChoiceImplementations => ({
  'conversation.getSettings': () => choices.settings(),
  'conversation.setSettings': (change) => choices.change(change),
  'voice.listVoices': () => choices.voices(),
  'voice.setVoice': ({ voice }) => choices.change({ voice }),
  'voice.saveCustomVoice': (input) => choices.saveCustomVoice(input),
  'voice.deleteCustomVoice': ({ id }) => choices.deleteCustomVoice(id),
  'conversation.setInstructions': ({ instructions }) =>
    choices.setInstructions(instructions),
  'conversation.setOptions': (change) => choices.setConversationOptions(change),
});

// The microphone and speaker of the App a call uses.
const deviceOperations = ({
  devices,
}: ConversationsPort): Pick<
  ConversationImplementations,
  'conversation.listDevices' | 'conversation.chooseDevices'
> => ({
  'conversation.listDevices': () => Promise.resolve(devices.list()),
  'conversation.chooseDevices': (change) =>
    Promise.resolve(devices.choose(change)),
});

// The greetings the App recorded from previews, and keeping them.
const clipOperations = ({
  previewClips,
}: ConversationsPort): Pick<
  ConversationImplementations,
  'voice.getPreviewClip' | 'voice.storePreviewClip'
> => ({
  'voice.getPreviewClip': (input) => previewClips.get(input),
  'voice.storePreviewClip': (input) => previewClips.store(input),
});

// Ending a Conversation: the App's End button, and an Agent hanging up its own.
const lifeOperations = (
  conversation: ConversationsPort,
): Pick<
  ConversationImplementations,
  'conversation.end' | 'conversation.hangUp'
> => ({
  'conversation.end': ({ sessionId }) =>
    Promise.resolve(conversation.end(sessionId)),
  'conversation.hangUp': ({ sessionId }) =>
    Promise.resolve(conversation.hangUp(sessionId)),
});

export function createConversationOperations(
  conversation: ConversationsPort,
  sessions: Pick<Sessions, 'open'>,
): ConversationImplementations {
  return {
    'conversation.status': () => conversation.status(),
    'conversation.start': startInOpenSession(conversation, sessions),
    'voice.preview': (input) => conversation.preview(input),
    ...lifeOperations(conversation),
    ...choiceOperations(conversation),
    ...deviceOperations(conversation),
    ...clipOperations(conversation),
  };
}
