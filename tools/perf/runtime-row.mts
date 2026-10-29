import {
  readFeedField,
  SessionUpdate,
  writeFeedRowField,
  type FeedSubscribeOutput,
} from '@repo/contracts';

type RowEvent = Extract<
  FeedSubscribeOutput,
  { type: 'row.upsert' | 'row.patch' | 'row.append' }
>;

function changedRow(
  row: SessionUpdate,
  event: Exclude<RowEvent, { type: 'row.upsert' }>,
): SessionUpdate {
  const set = event.type === 'row.patch' ? event.set : appended(row, event);

  return SessionUpdate.parse({ ...row, ...set, revision: event.rev });
}

function appended(
  row: SessionUpdate,
  event: Extract<RowEvent, { type: 'row.append' }>,
): ReturnType<typeof writeFeedRowField> {
  const previous = readFeedField(row, event.field.split('.'));

  if (typeof previous !== 'string' || previous.length !== event.off)
    throw new Error(`Feed append gap at row ${event.id}`);

  return writeFeedRowField(row, event.field, previous + event.text);
}

// Duplicate revisions never append output twice; a gap is a failed observation, not a guessed timing.
export function applyRuntimeRow(
  rows: Map<string, SessionUpdate>,
  event: RowEvent,
): SessionUpdate | undefined {
  const id = eventId(event);
  const previous = rows.get(id);

  if (duplicateRevision(previous, event.rev)) return undefined;

  const row =
    event.type === 'row.upsert'
      ? event.row
      : changedRow(requireRow(previous, id), event);

  rows.set(id, row);

  return row;
}

function requireRow(row: SessionUpdate | undefined, id: string): SessionUpdate {
  if (!row)
    throw new Error(`Feed row ${id} was not received before its change`);

  return row;
}

function duplicateRevision(
  row: SessionUpdate | undefined,
  revision: number,
): boolean {
  return row !== undefined && row.revision >= revision;
}

function eventId(event: RowEvent): string {
  return event.type === 'row.upsert' ? event.row.id : event.id;
}
