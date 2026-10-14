import type { ErrorToast } from './toast';

// Android's toast is a single line of text, so the message follows the title there.
export function toastTitle({ title, message }: ErrorToast): string {
  return message ? `${title} ${message}` : title;
}
