import type { ErrorToast } from './toast';

// Android's toast is a single line of text, so the message follows the title as its own sentence.
export function toastTitle({ title, message }: ErrorToast): string {
  if (!message) return title;

  const separator = /[.!?]$/.test(title) ? ' ' : '. ';

  return `${title}${separator}${message}`;
}
