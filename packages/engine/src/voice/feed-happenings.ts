import type { FeedStreamEvent } from '../feed';
import type { SessionHappening } from './session-link';

type Row = Extract<FeedStreamEvent, { type: 'row.upsert' }>['row'];

type Tracked = { kind: 'agent' | 'person'; text: string };

const textOf = (row: Extract<Row, { content: unknown[] }>): string =>
  row.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('');

const tracked = (row: Row): Tracked | undefined => {
  if (row.sessionUpdate === 'agent_message')
    return { kind: 'agent', text: textOf(row) };

  return row.sessionUpdate === 'user_message'
    ? { kind: 'person', text: textOf(row) }
    : undefined;
};

const happeningOf = (id: string, { kind, text }: Tracked): SessionHappening =>
  kind === 'agent'
    ? { type: 'agent.message', id, text }
    : { type: 'person.typed', text };

/*
 * Reads a Session's Feed changes as the words the voice cares about: a settled Agent message and a Prompt the person
 * typed. Each row is reported once, when it settles; Tool calls, thoughts and Notices are not reported at all. A Turn's
 * end comes from the Session, not from its Feed.
 */
export class FeedHappenings {
  private readonly rows = new Map<string, Tracked>();
  private readonly reported = new Set<string>();

  public read(events: readonly FeedStreamEvent[]): SessionHappening[] {
    return events.flatMap((event) => this.one(event));
  }

  private one(event: FeedStreamEvent): SessionHappening[] {
    if (event.type === 'row.upsert') return this.upsert(event.row);

    return event.type === 'row.append' ? this.append(event) : this.patch(event);
  }

  private patch(
    event: Extract<FeedStreamEvent, { type: 'row.patch' }>,
  ): SessionHappening[] {
    return event.set['state'] === 'settled' ? this.settle(event.id) : [];
  }

  private upsert(row: Row): SessionHappening[] {
    const seen = tracked(row);

    if (!seen) return [];
    this.rows.set(row.id, seen);

    return row.state === 'settled' ? this.settle(row.id) : [];
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
