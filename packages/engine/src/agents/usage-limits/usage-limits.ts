import { EventEmitter, on } from 'node:events';
import type {
  AgentAuthSubject,
  AgentUsageLimits,
  UsageLimit,
} from '@repo/contracts';

type UsageLimitsEvent = { key: string; limits: AgentUsageLimits };

type UsageLimitsEvents = EventEmitter<{ change: [UsageLimitsEvent] }>;

export const subjectKey = (subject: AgentAuthSubject): string =>
  JSON.stringify([subject.agent, subject.projectId]);

const limitKey = (limit: UsageLimit): string =>
  JSON.stringify([limit.id, limit.model ?? null]);

// What a Device would see change: a newer reading with the same values is not news.
const withoutObservedAt = ({
  observedAt: _observedAt,
  ...limit
}: UsageLimit): Omit<UsageLimit, 'observedAt'> => limit;

type Readings = Map<string, UsageLimit>;

function combine(latest: UsageLimit, older: UsageLimit): UsageLimit {
  if (latest.measure.kind !== 'none') return latest;

  return { ...latest, measure: older.measure, resetsAt: older.resetsAt };
}

function prefer(account: UsageLimit, acp: UsageLimit | undefined): UsageLimit {
  if (!acp) return account;

  return account.observedAt >= acp.observedAt
    ? combine(account, acp)
    : combine(acp, account);
}

function readLimits(
  acp: Readings | undefined,
  account: Readings | undefined,
): AgentUsageLimits {
  const limits = new Map(acp);

  for (const [name, reading] of account ?? [])
    limits.set(name, prefer(reading, limits.get(name)));

  return { limits: [...limits.values()] };
}

const content = ({ limits }: AgentUsageLimits): string =>
  JSON.stringify(limits.map(withoutObservedAt));

// One per Engine: every connection publishes here, so every Device watching an Agent and Project sees the same Usage limits.
export class UsageLimits {
  private readonly acp = new Map<string, Readings>();
  private readonly account = new Map<string, Readings>();
  private readonly events: UsageLimitsEvents = new EventEmitter();
  public constructor() {
    // Each watching App holds one listener; the count is bounded by open subscriptions.
    this.events.setMaxListeners(0);
  }
  public publish(
    subject: AgentAuthSubject,
    readings: readonly UsageLimit[],
  ): void {
    if (readings.length === 0) return;

    const key = subjectKey(subject);
    const before = this.read(subject);
    const limits = new Map(this.acp.get(key));

    for (const reading of readings) limits.set(limitKey(reading), reading);

    this.acp.set(key, limits);
    this.emitChange(subject, before);
  }
  public publishAccount(
    subject: AgentAuthSubject,
    readings: readonly UsageLimit[],
  ): void {
    const before = this.read(subject);

    const limits = new Map(
      readings.map((reading) => [limitKey(reading), reading]),
    );

    this.account.set(subjectKey(subject), limits);
    this.emitChange(subject, before);
  }
  private emitChange(
    subject: AgentAuthSubject,
    before: AgentUsageLimits,
  ): void {
    const limits = this.read(subject);

    if (content(before) === content(limits)) return;

    this.events.emit('change', { key: subjectKey(subject), limits });
  }
  public read(subject: AgentAuthSubject): AgentUsageLimits {
    const key = subjectKey(subject);

    return readLimits(this.acp.get(key), this.account.get(key));
  }
  public watch(
    subject: AgentAuthSubject,
    signal: AbortSignal,
  ): AsyncGenerator<AgentUsageLimits> {
    return readUsageLimitsStream(this.events, subjectKey(subject), signal);
  }
}

async function* readUsageLimitsStream(
  events: UsageLimitsEvents,
  key: string,
  signal: AbortSignal,
): AsyncGenerator<AgentUsageLimits> {
  try {
    yield* subjectLimits(on(events, 'change', { signal }), key);
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}

async function* subjectLimits(
  stream: AsyncIterable<UsageLimitsEvent[]>,
  key: string,
): AsyncGenerator<AgentUsageLimits> {
  for await (const changes of stream)
    yield* changes
      .filter((change) => change.key === key)
      .map((change) => change.limits);
}
