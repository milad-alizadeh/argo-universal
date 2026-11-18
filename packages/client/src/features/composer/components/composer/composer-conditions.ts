import { maxBlobUploadBytes } from '@repo/contracts';
import type { ComposerProps } from './composer-types';

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

export function sendButtonState(
  props: ComposerProps,
): 'stop' | 'sending' | 'ready' | 'blocked' {
  const candidates = [
    ['stop', hasStopAction(props)],
    ['sending', props.sending],
    ['ready', isSendReady(props)],
  ] as const;

  return candidates.find(([, active]) => active)?.[0] ?? 'blocked';
}

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

// What Send does to a written draft: Queue it behind the running turn, or send it now.
export function sendsToQueue(
  props: Pick<ComposerProps, 'configuration' | 'queueWhileRunning'>,
): boolean {
  return isTurnRunning(props) && props.queueWhileRunning === true;
}

function allowsSubmission(props: ComposerProps): boolean {
  return !isTurnRunning(props) || props.queueWhileRunning === true;
}
