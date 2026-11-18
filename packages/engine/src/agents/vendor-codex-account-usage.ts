import type { UsageLimit } from '@repo/contracts';
import { z } from 'zod';
import { type Window, duration } from './vendor-codex-duration';
import {
  type AccountJson,
  type Amount,
  type LimitName,
  accountReading,
  epochReset,
  fullPercent,
  secondsReset,
  usagePercent,
} from './vendor-usage-reading';

const CodexWindow = z.object({
  usedPercent: usagePercent,
  windowDurationMins: z.number().positive().nullish().catch(null),
  resetsAt: epochReset,
});

const CodexSpend = z.object({
  remainingPercent: z.number().min(0).max(fullPercent),
  resetsAt: epochReset,
});

const CodexBucket = z.object({
  limitId: z.string().nullish(),
  limitName: z.string().nullish(),
  primary: CodexWindow.nullish().catch(null),
  secondary: CodexWindow.nullish().catch(null),
  individualLimit: CodexSpend.nullish().catch(null),
});

const CodexUsage = z.object({
  rateLimits: CodexBucket.nullish().catch(null),
  rateLimitsByLimitId: z
    .record(z.string(), CodexBucket.nullable().catch(null))
    .nullish(),
});

type Bucket = z.infer<typeof CodexBucket>;

type Usage = z.infer<typeof CodexUsage>;

type Identity = { id: string; model?: string };

function windowName(
  identity: Identity,
  label: string,
  window: Window,
): LimitName {
  return {
    ...identity,
    label: identity.model ? `${identity.model} ${label.toLowerCase()}` : label,
    window,
  };
}

function readWindow(
  identity: Identity,
  window: z.infer<typeof CodexWindow>,
  observedAt: string,
): UsageLimit {
  const [kind, label] = duration(window.windowDurationMins);

  return accountReading(
    windowName(identity, label, kind),
    {
      used: window.usedPercent,
      resetsAt: secondsReset(window.resetsAt),
    },
    observedAt,
  );
}

function windows(
  identity: Identity,
  bucket: Bucket,
  observedAt: string,
): UsageLimit[] {
  return (['primary', 'secondary'] as const).flatMap((slot) => {
    const window = bucket[slot];
    const id = `${identity.id}:${slot}`;

    return window ? [readWindow({ ...identity, id }, window, observedAt)] : [];
  });
}

function spend(
  identity: Identity,
  bucket: Bucket,
  observedAt: string,
): UsageLimit[] {
  const limit = bucket.individualLimit;

  if (!limit) return [];

  return [readSpend(identity, limit, observedAt)];
}

function readSpend(
  identity: Identity,
  limit: z.infer<typeof CodexSpend>,
  observedAt: string,
): UsageLimit {
  const name = windowName(
    { ...identity, id: `${identity.id}:spend` },
    'Individual spend limit',
    'other',
  );

  return accountReading(name, spendAmount(limit), observedAt);
}

function spendAmount(limit: z.infer<typeof CodexSpend>): Amount {
  return {
    used: fullPercent - limit.remainingPercent,
    resetsAt: secondsReset(limit.resetsAt),
  };
}

function fallbackBucket(
  bucket: Usage['rateLimits'],
  defaultId: string,
): [string, Bucket][] {
  return bucket ? [[bucket.limitId ?? defaultId, bucket]] : [];
}

function buckets(usage: Usage, defaultId: string): Map<string, Bucket> {
  const reported = Object.entries(usage.rateLimitsByLimitId ?? {});

  return new Map([
    ...fallbackBucket(usage.rateLimits, defaultId),
    ...reported.filter((row): row is [string, Bucket] => row[1] !== null),
  ]);
}

function readBucket(
  identity: Identity,
  bucket: Bucket,
  observedAt: string,
): UsageLimit[] {
  return [
    ...windows(identity, bucket, observedAt),
    ...spend(identity, bucket, observedAt),
  ];
}

export function codexAccountUsage(
  response: AccountJson,
  observedAt: string,
  defaultId: string,
): UsageLimit[] | undefined {
  const usage = CodexUsage.safeParse(response).data;

  if (!usage) return;

  return [...buckets(usage, defaultId)].flatMap(([id, bucket]) =>
    readBucket(
      { id, model: modelName(id, defaultId, bucket) },
      bucket,
      observedAt,
    ),
  );
}

function modelName(
  id: string,
  defaultId: string,
  bucket: Bucket,
): string | undefined {
  return id === defaultId ? undefined : bucket.limitName || id;
}
