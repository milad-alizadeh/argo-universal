import { maxBlobUploadBytes } from '@repo/contracts';
import type {
  ComposerProps,
  ComposerVoiceCall,
  SendState,
} from './composer-types';

function hasOversizedAttachment(props: ComposerProps): boolean {
  return oversizedAttachmentIds(props).length > 0;
}

export function oversizedAttachmentIds(props: ComposerProps): string[] {
  return props.draft.attachments
    .filter((attachment) => attachment.bytes > maxBlobUploadBytes)
    .map((attachment) => attachment.id);
}

export function isInactive(props: ComposerProps): boolean {
  return Boolean(props.sending || props.disabled);
}

export function isConfigurationInactive(props: ComposerProps): boolean {
  return Boolean(props.sending || props.disabled);
}

function isSendReady(props: ComposerProps): boolean {
  return (
    canSubmit(props) && (hasDraftContent(props) || sendResumesQueue(props))
  );
}

function canSubmit(props: ComposerProps): boolean {
  return editableForSend(props) && !hasOversizedAttachment(props);
}

function editableForSend(props: ComposerProps): boolean {
  return !isInactive(props) && isConnectionSendable(props);
}

function hasDraftContent({ draft }: ComposerProps): boolean {
  return draft.text.trim().length > 0 || draft.attachments.length > 0;
}

// With the queue paused and nothing written, Send resumes it, so its first Queued Prompt goes next.
export function sendResumesQueue(props: ComposerProps): boolean {
  return hasPausedQueue(props) && isEmptyDraft(props);
}

function hasPausedQueue({ promptQueue }: ComposerProps): boolean {
  if (!promptQueue) return false;
  const { pauseReason, items } = promptQueue.queue;

  return Boolean(pauseReason && items.length);
}

function isEmptyDraft(props: ComposerProps): boolean {
  return !props.queueEdit && !hasDraftContent(props);
}

// The primary button: Stop, Send, or, with nothing written, the voice button while no call runs and End while one does. Text in the draft is always Send.
export function sendButtonState(props: ComposerProps): SendState {
  return callSendState(props) ?? idleSendState(props);
}

const inCall: Partial<Record<ComposerVoiceCall, 'connecting' | 'end'>> = {
  connecting: 'connecting',
  connected: 'end',
};

const voiceCall = (props: ComposerProps): ComposerVoiceCall =>
  props.voice?.call ?? 'none';

// While a call runs here and the draft is empty, the button is End: it comes back as Send once the person types.
function callSendState(props: ComposerProps): 'connecting' | 'end' | undefined {
  return hasDraftContent(props) ? undefined : inCall[voiceCall(props)];
}

function idleSendState(props: ComposerProps): SendState {
  const state = baseSendState(props);

  return state === 'blocked' ? emptyDraftState(props) : state;
}

// With nothing to send, the primary slot starts a call, or points at the one running in another Session.
function emptyDraftState(props: ComposerProps): SendState {
  if (voiceCall(props) === 'elsewhere' && !hasDraftContent(props))
    return 'elsewhere';

  return canStartVoice(props) ? 'voice' : 'blocked';
}

function baseSendState(props: ComposerProps): SendState {
  const candidates = [
    ['stop', hasStopAction(props)],
    ['sending', props.sending],
    ['ready', isSendReady(props)],
  ] as const;

  return candidates.find(([, active]) => active)?.[0] ?? 'blocked';
}

// A call here, or in another Session, keeps a second from starting: one Voice call runs per App.
const voiceStartConditions: ((props: ComposerProps) => boolean)[] = [
  (props) => props.voice?.usable === true,
  (props) => voiceCall(props) === 'none',
  (props) => !isInactive(props),
  (props) => props.sendable ?? true,
  (props) => !props.queueEdit,
  (props) => !hasDraftContent(props),
];

const canStartVoice = (props: ComposerProps): boolean =>
  voiceStartConditions.every((condition) => condition(props));

function isConnectionSendable(props: ComposerProps): boolean {
  return (props.sendable ?? true) && allowsSubmission(props);
}

function isTurnRunning({ configuration }: ComposerProps): boolean {
  return Boolean(configuration?.turnRunning);
}

function hasStopAction(props: ComposerProps): boolean {
  return (
    isTurnRunning(props) && Boolean(props.onStop) && !props.queueWhileRunning
  );
}

function allowsSubmission(props: ComposerProps): boolean {
  return !isTurnRunning(props) || props.queueWhileRunning === true;
}
