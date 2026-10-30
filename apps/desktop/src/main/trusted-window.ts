import type { IpcMainEvent } from 'electron';

export function isTrustedWindow(
  event: Pick<IpcMainEvent, 'senderFrame'>,
  origin: string,
): boolean {
  return event.senderFrame?.origin === origin;
}
