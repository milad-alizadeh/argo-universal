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

type Notice = Extract<Row, { sessionUpdate: 'notice' }>;

type End = NonNullable<NonNullable<Notice['_meta']>['argo']>['turnEnd'];

const endOf = (row: Notice): End => row._meta?.argo?.turnEnd;

const errorOf = (end: NonNullable<End>): string | null =>
  end.error?.message ?? null;

const endedHappening = (
  end: End,
  turnId: string | null,
): SessionHappening | undefined =>
  end && {
    type: 'turn.ended',
    turnId,
    stopReason: end.stopReason,
    error: errorOf(end),
  };

const turnEndOf = (row: Row): SessionHappening | undefined =>
  row.sessionUpdate === 'notice'
    ? endedHappening(endOf(row), row.turnId)
    : undefined;

type PromptRow = Extract<Row, { sessionUpdate: 'prompt_message' }>;

type Argo = NonNullable<PromptRow['_meta']>['argo'];

const argoOf = (row: PromptRow): Argo => row._meta?.argo;

const senderOf = (row: PromptRow): string | undefined =>
  argoOf(row)?.sender?.type;

const isVoicePrompt = (row: Row): row is PromptRow =>
  row.sessionUpdate === 'prompt_message' && senderOf(row) === 'voice';

// A Prompt row in a Turn; one with no Turn yet is not reported until it has one.
const promptedOf = (row: Row): SessionHappening | undefined =>
  isVoicePrompt(row) && row.turnId !== null
    ? { type: 'voice.prompted', turnId: row.turnId }
    : undefined;

const happeningOf = (id: string, { kind, text }: Tracked): SessionHappening =>
  kind === 'agent'
    ? { type: 'agent.message', id, text }
    : { type: 'person.typed', text };

/*
 * Reads a Session's Feed changes as what the voice cares about: a settled Agent message, a Prompt the person typed, and a
 * Turn's end. Each row is reported once, when it settles; Tool calls and thoughts are not reported at all.
 */
export class FeedHappenings {
  private readonly rows = new Map<string, Tracked>();
  private readonly reported = new Set<string>();
  // Voice Prompt rows that have no Turn yet, until a change gives them one.
  private readonly turnless = new Set<string>();

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
    const given = this.givenTurn(event);

    if (given) return given;

    return event.set['state'] === 'settled' ? this.settle(event.id) : [];
  }

  // A voice Prompt that waited for its Turn has one now.
  private givenTurn(
    event: Extract<FeedStreamEvent, { type: 'row.patch' }>,
  ): SessionHappening[] | undefined {
    const { turnId } = event.set;

    return typeof turnId === 'string' && this.turnless.delete(event.id)
      ? this.once(event.id, { type: 'voice.prompted', turnId })
      : undefined;
  }

  private upsert(row: Row): SessionHappening[] {
    const found = turnEndOf(row) ?? this.prompted(row);

    return found ? this.once(row.id, found) : this.track(row);
  }

  private prompted(row: Row): SessionHappening | undefined {
    if (isVoicePrompt(row) && row.turnId === null) this.turnless.add(row.id);

    return promptedOf(row);
  }

  private track(row: Row): SessionHappening[] {
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
