import type { AttachmentError } from '#features/composer';

interface Failure {
  message: string;
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
): string | undefined => (failure ? `${prefix} ${failure.message}` : undefined);

// The messages in the order the Composer prefers them.
const inOrder = ({
  attachment,
  prompt,
  configuration,
}: SendFailures): (string | undefined)[] => [
  reason("Couldn't send.", prompt),
  attachment?.message,
  reason("Couldn't change settings.", configuration),
];

// The one error the Composer shows: a failed selection first, then the prompt, the upload and settings.
export function toSendError(failures: SendFailures): string | undefined {
  const { attachment } = failures;

  if (attachment?.kind === 'selection') return attachment.message;

  return inOrder(failures).find((message) => message !== undefined);
}
