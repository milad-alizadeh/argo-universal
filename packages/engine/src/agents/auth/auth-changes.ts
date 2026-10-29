import { EventEmitter, on } from 'node:events';
import type { AgentAuthChange, AgentAuthSubject } from '@repo/contracts';

type AuthChangeEvent = { subject: AgentAuthSubject; change: AgentAuthChange };

type AuthChangeEvents = EventEmitter<{ change: [AuthChangeEvent] }>;

// One per Engine: every connection publishes here, so every Device watching an Agent and Project sees the same changes.
export class AuthChanges {
  private readonly descriptions = new Map<string, string>();
  private readonly events: AuthChangeEvents = new EventEmitter();
  public constructor() {
    // Each watching App holds one listener; the count is bounded by open subscriptions.
    this.events.setMaxListeners(0);
  }
  public publish(subject: AgentAuthSubject, change: AgentAuthChange): void {
    const key = JSON.stringify([subject.agent, subject.projectId]);

    if (change.description !== undefined)
      this.descriptions.set(key, change.description);
    this.clearSignedInDescription(key, change);
    this.events.emit('change', { subject, change });
  }
  private clearSignedInDescription(key: string, change: AgentAuthChange): void {
    if (change.outcome?.status === 'ok') this.descriptions.delete(key);
  }
  public requiredDescription(
    agent: string,
    projectId: string,
  ): string | undefined {
    return this.descriptions.get(JSON.stringify([agent, projectId]));
  }
  public watch(
    subject: AgentAuthSubject,
    signal: AbortSignal,
  ): AsyncGenerator<AgentAuthChange> {
    return readAuthChangeStream(this.events, subject, signal);
  }
}

const sameSubject = (
  left: AgentAuthSubject,
  right: AgentAuthSubject,
): boolean => left.agent === right.agent && left.projectId === right.projectId;

async function* readAuthChangeStream(
  events: AuthChangeEvents,
  subject: AgentAuthSubject,
  signal: AbortSignal,
): AsyncGenerator<AgentAuthChange> {
  try {
    yield* subjectChanges(on(events, 'change', { signal }), subject);
  } catch (error) {
    rethrowUncancelledAuthStreamFailure(signal, error);
  }
}

async function* subjectChanges(
  stream: AsyncIterable<AuthChangeEvent[]>,
  subject: AgentAuthSubject,
): AsyncGenerator<AgentAuthChange> {
  for await (const changes of stream)
    yield* changes
      .filter((event) => sameSubject(event.subject, subject))
      .map((event) => event.change);
}

function rethrowUncancelledAuthStreamFailure(
  signal: AbortSignal,
  cause: unknown,
): void {
  if (!signal.aborted) throw cause;
}
