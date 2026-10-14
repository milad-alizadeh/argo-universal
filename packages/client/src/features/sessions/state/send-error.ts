import type { AttachmentError } from '#features/composer';

interface Failure {
  message: string;
  key?: string;
}

// What has failed in a Session's Composer since its last successful command.
export interface SendFailures {
  attachment?: AttachmentError;
  prompt?: Failure | null;
  configuration?: Failure | null;
}

const reason = (
  prefix: string,
  failure: Failure | null | undefined,
): Failure | undefined =>
  failure
    ? { message: `${prefix} ${failure.message}`, key: failure.key }
    : undefined;

// The messages in the order the Composer prefers them.
const inOrder = ({
  attachment,
  prompt,
  configuration,
}: SendFailures): (Failure | undefined)[] => [
  reason("Couldn't send.", prompt),
  attachment,
  reason("Couldn't change settings.", configuration),
];

// The one error the Composer shows: a failed selection first, then the prompt, the upload and settings.
export function toSendError(failures: SendFailures): Failure | undefined {
  const { attachment } = failures;

  if (attachment?.kind === 'selection') return attachment;

  return inOrder(failures).find((message) => message !== undefined);
}
