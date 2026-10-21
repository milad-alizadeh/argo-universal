import type { ErrorToast } from './toast';

// iOS and the web show the message under the title.
export function toastTitle({ title }: ErrorToast): string {
  return title;
}
