import { maxBlobUploadBytes } from '@repo/contracts';
import type {
  ComposerProps,
  ComposerVoice,
  ComposerVoiceElsewhere,
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

function hasDraftContent({ draft }: Pick<ComposerProps, 'draft'>): boolean {
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

const inCall: Partial<Record<ComposerVoice['kind'], 'connecting' | 'end'>> = {
  connecting: 'connecting',
  connected: 'end',
};

// While a call runs here and the draft is empty, the button is End: it comes back as Send once the person types.
function callSendState(props: ComposerProps): 'connecting' | 'end' | undefined {
  if (hasDraftContent(props) || !props.voice) return undefined;

  return inCall[props.voice.kind];
}

function idleSendState(props: ComposerProps): SendState {
  const state = baseSendState(props);

  return state === 'blocked' && canStartVoice(props) ? 'voice' : state;
}

/*
 * The pointer to a call in another Session: a small icon button exactly where the voice button would be, since a
 * second call cannot start. Everywhere else the Composer is a normal Session's.
 */
export function callPointer(
  props: ComposerProps,
): ComposerVoiceElsewhere | undefined {
  return pointsElsewhere(props) ? elsewhereOf(props.voice) : undefined;
}

// The voice button's place is free: nothing else takes the primary slot, and the Composer could start a call.
const pointsElsewhere = (props: ComposerProps): boolean =>
  sendButtonState(props) === 'blocked' && voiceSlotFree(props);

const elsewhereOf = (
  voice: ComposerProps['voice'],
): ComposerVoiceElsewhere | undefined =>
  voice?.kind === 'elsewhere' ? voice : undefined;

function baseSendState(props: ComposerProps): SendState {
  const candidates = [
    ['stop', hasStopAction(props)],
    ['sending', props.sending],
    ['ready', isSendReady(props)],
  ] as const;

  return candidates.find(([, active]) => active)?.[0] ?? 'blocked';
}

// Where the voice button may stand: an idle, sendable Composer with nothing written and no Queued Prompt being edited.
const voiceSlotConditions: ((props: ComposerProps) => boolean)[] = [
  (props) => !isInactive(props),
  (props) => props.sendable ?? true,
  (props) => !props.queueEdit,
  (props) => !hasDraftContent(props),
];

const voiceSlotFree = (props: ComposerProps): boolean =>
  voiceSlotConditions.every((condition) => condition(props));

// The voice module offers the voice button only while no call runs anywhere: one Voice call runs per App.
const canStartVoice = (props: ComposerProps): boolean =>
  props.voice?.kind === 'start' && voiceSlotFree(props);

function isConnectionSendable(props: ComposerProps): boolean {
  return (props.sendable ?? true) && allowsSubmission(props);
}

function isTurnRunning({
  configuration,
}: Pick<ComposerProps, 'configuration'>): boolean {
  return Boolean(configuration?.turnRunning);
}

// While a turn runs the one button is Stop, unless a written draft would queue behind it.
function hasStopAction(props: ComposerProps): boolean {
  return isTurnRunning(props) && Boolean(props.onStop) && !queuesDraft(props);
}

function queuesDraft(props: ComposerProps): boolean {
  return props.queueWhileRunning === true && !isIdleDraft(props);
}

function isIdleDraft(props: ComposerProps): boolean {
  return isEmptyDraft(props) && !sendResumesQueue(props);
}

type QueueingProps = Pick<
  ComposerProps,
  'configuration' | 'queueWhileRunning' | 'queueEdit' | 'draft'
>;

/*
 * What Send does to a written draft: Queue it behind the running turn, or send it now. Editing a Queued Prompt
 * saves it in place, and an empty draft resumes a paused queue, so both keep Send's name.
 */
export function sendsToQueue(props: QueueingProps): boolean {
  return queuesWhileRunning(props) && writtenNewDraft(props);
}

const queuesWhileRunning = (props: QueueingProps): boolean =>
  isTurnRunning(props) && props.queueWhileRunning === true;

const writtenNewDraft = (props: QueueingProps): boolean =>
  !props.queueEdit && hasDraftContent(props);

function allowsSubmission(props: ComposerProps): boolean {
  return !isTurnRunning(props) || props.queueWhileRunning === true;
}
