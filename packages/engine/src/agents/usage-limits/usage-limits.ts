import { EventEmitter, on } from 'node:events';
import type {
  AgentAuthSubject,
  AgentUsageLimits,
  UsageLimit,
} from '@repo/contracts';

type UsageLimitsEvent = { key: string; limits: AgentUsageLimits };

type UsageLimitsEvents = EventEmitter<{ change: [UsageLimitsEvent] }>;

const subjectKey = (subject: AgentAuthSubject): string =>
  JSON.stringify([subject.agent, subject.projectId]);

const limitKey = (limit: UsageLimit): string =>
  JSON.stringify([limit.id, limit.model ?? null]);

// What a Device would see change: a newer reading with the same values is not news.
const withoutObservedAt = ({
  observedAt: _observedAt,
  ...limit
}: UsageLimit): Omit<UsageLimit, 'observedAt'> => limit;

const sameReading = (left: UsageLimit, right: UsageLimit): boolean =>
  JSON.stringify(withoutObservedAt(left)) ===
  JSON.stringify(withoutObservedAt(right));

// Keeps the reading and says whether a Device would see a change.
function replace(
  limits: Map<string, UsageLimit>,
  reading: UsageLimit,
): boolean {
  const key = limitKey(reading);
  const previous = limits.get(key);
  limits.set(key, reading);

  return !previous || !sameReading(previous, reading);
}

// One per Engine: every connection publishes here, so every Device watching an Agent and Project sees the same Usage limits.
export class UsageLimits {
  private readonly bySubject = new Map<string, Map<string, UsageLimit>>();
  private readonly events: UsageLimitsEvents = new EventEmitter();
  public constructor() {
    // Each watching App holds one listener; the count is bounded by open subscriptions.
    this.events.setMaxListeners(0);
  }
  // Each reading replaces the one with its id and model; the others stay.
  public publish(
    subject: AgentAuthSubject,
    readings: readonly UsageLimit[],
  ): void {
    const key = subjectKey(subject);
    const limits = this.limitsOf(key);
    const changes = readings.map((reading) => replace(limits, reading));

    if (changes.includes(true))
      this.events.emit('change', { key, limits: this.read(subject) });
  }
  private limitsOf(key: string): Map<string, UsageLimit> {
    const limits = this.bySubject.get(key) ?? new Map<string, UsageLimit>();
    this.bySubject.set(key, limits);

    return limits;
  }
  public read(subject: AgentAuthSubject): AgentUsageLimits {
    return {
      limits: [...(this.bySubject.get(subjectKey(subject))?.values() ?? [])],
    };
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
