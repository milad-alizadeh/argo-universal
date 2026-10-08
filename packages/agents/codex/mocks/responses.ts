import type { VendorMessage } from '../messages';
import type {
  TurnStartedNotification,
  TurnCompletedNotification,
  ItemStartedNotification,
  ItemCompletedNotification,
  ThreadTokenUsageUpdatedNotification,
} from '../protocol.gen';
export const turnStarted = (
  params: TurnStartedNotification,
  receivedAt?: number,
): VendorMessage => ({
  method: 'turn/started',
  params,
  ...(receivedAt === undefined ? {} : { receivedAt }),
});
export const turnCompleted = (
  params: TurnCompletedNotification,
  receivedAt?: number,
): VendorMessage => ({
  method: 'turn/completed',
  params,
  ...(receivedAt === undefined ? {} : { receivedAt }),
});
export const itemStarted = (
  params: ItemStartedNotification,
  receivedAt?: number,
): VendorMessage => ({
  method: 'item/started',
  params,
  ...(receivedAt === undefined ? {} : { receivedAt }),
});
export const itemCompleted = (
  params: ItemCompletedNotification,
  receivedAt?: number,
): VendorMessage => ({
  method: 'item/completed',
  params,
  ...(receivedAt === undefined ? {} : { receivedAt }),
});
export const usage = (
  params: ThreadTokenUsageUpdatedNotification,
  receivedAt?: number,
): VendorMessage => ({
  method: 'thread/tokenUsage/updated',
  params,
  ...(receivedAt === undefined ? {} : { receivedAt }),
});
