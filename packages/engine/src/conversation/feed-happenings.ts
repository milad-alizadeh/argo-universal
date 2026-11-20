import { messageText, type FeedStreamEvent } from '../feed';
import type { SessionHappening } from './session-link';

type Row = Extract<FeedStreamEvent, { type: 'row.upsert' }>['row'];

type Tracked = { kind: 'agent' | 'person'; text: string; turnless: boolean };

const tracked = (row: Row): Tracked | undefined => {
  const turnless = row.turnId === null;

  if (row.sessionUpdate === 'agent_message')
    return { kind: 'agent', text: messageText(row.content), turnless };

  return row.sessionUpdate === 'user_message'
    ? { kind: 'person', text: messageText(row.content), turnless }
    : undefined;
};

const happeningOf = (
  id: string,
  { kind, text, turnless }: Tracked,
): SessionHappening =>
  kind === 'agent'
    ? { type: 'agent.message', id, text, turnless }
    : { type: 'person.typed', text };

// An Agent message with no Turn is written settled at once and keeps growing while the Agent streams into it (ADR-0024).
const growsUnsettled = (seen: Tracked): boolean =>
  seen.kind === 'agent' && seen.turnless;

/*
 * Reads a Session's Feed changes as the words the voice cares about: a settled Agent message and a Prompt the person
 * typed. Each row is reported once, when it settles; Tool calls, thoughts and Notices are not reported at all. A Turn's
 * end comes from the Session, not from its Feed. An Agent message outside any Turn has no settling to wait for, so it is
 * held while it grows and reported once it goes quiet or another row starts.
 */
export class FeedHappenings {
  private readonly rows = new Map<string, Tracked>();
  private readonly reported = new Set<string>();
  private readonly growing = new Set<string>();

  public read(events: readonly FeedStreamEvent[]): SessionHappening[] {
    return events.flatMap((event) => this.one(event));
  }

  // Whether an Agent message outside any Turn is still held, waiting to go quiet.
  public get holding(): boolean {
    return this.growing.size > 0;
  }

  // The held Agent messages went quiet: each is reported as it now reads.
  public quiet(): SessionHappening[] {
    return [...this.growing].flatMap((id) => this.release(id));
  }

  private one(event: FeedStreamEvent): SessionHappening[] {
    if (event.type === 'row.upsert') return this.upsert(event.row);

    return event.type === 'row.append' ? this.append(event) : this.patch(event);
  }

  private patch(
    event: Extract<FeedStreamEvent, { type: 'row.patch' }>,
  ): SessionHappening[] {
    return event.set['state'] === 'settled' && !this.growing.has(event.id)
      ? this.settle(event.id)
      : [];
  }

  private upsert(row: Row): SessionHappening[] {
    const seen = tracked(row);
    const earlier = this.othersThan(row.id);

    if (!seen) return earlier;
    this.rows.set(row.id, seen);

    return [...earlier, ...this.taken(row, seen)];
  }

  private taken(row: Row, seen: Tracked): SessionHappening[] {
    if (growsUnsettled(seen)) return this.hold(row.id);

    return row.state === 'settled' ? this.settle(row.id) : [];
  }

  private hold(id: string): SessionHappening[] {
    if (!this.reported.has(id)) this.growing.add(id);

    return [];
  }

  // A new row means the Agent moved on from the messages it was growing.
  private othersThan(id: string): SessionHappening[] {
    return [...this.growing]
      .filter((held) => held !== id)
      .flatMap((held) => this.release(held));
  }

  private release(id: string): SessionHappening[] {
    this.growing.delete(id);

    return this.settle(id);
  }

  private append(
    event: Extract<FeedStreamEvent, { type: 'row.append' }>,
  ): SessionHappening[] {
    const row = this.rows.get(event.id);

    if (row && event.field === 'content.0.text') row.text += event.text;

    return [];
  }

  private settle(id: string): SessionHappening[] {
    const row = this.rows.get(id);

    return row ? this.once(id, happeningOf(id, row)) : [];
  }

  private once(id: string, happening: SessionHappening): SessionHappening[] {
    if (this.reported.has(id)) return [];
    this.reported.add(id);

    return [happening];
  }
}
