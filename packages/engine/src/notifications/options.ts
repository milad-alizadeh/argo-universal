export interface NotificationOptions {
  attentionLeaseMs?: number;
  retryMs?: number;
  lifetimeMs?: number;
}

const defaultAttentionLeaseMs = 30_000;

const defaultRetryMs = 2000;

const defaultLifetimeMs = 60_000;

export const notificationQueueLimit = 64;

export const recentNotificationLimit = 2048;

export function notificationOptions(
  options: NotificationOptions = {},
): Required<NotificationOptions> {
  return {
    attentionLeaseMs: duration(
      options.attentionLeaseMs,
      defaultAttentionLeaseMs,
    ),
    retryMs: duration(options.retryMs, defaultRetryMs),
    lifetimeMs: duration(options.lifetimeMs, defaultLifetimeMs),
  };
}

const duration = (value: number | undefined, fallback: number): number =>
  value ?? fallback;
