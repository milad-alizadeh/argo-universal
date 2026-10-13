import {
  type FeedChange,
  type FeedUpsert,
  feedSetFields,
  readFeedField,
  type SessionUpdate,
  type SessionUpdateKind,
  writeFeedRowField,
} from '@repo/contracts';
import type { Feed, FeedStreamEvent } from './feed-change';

export type FeedCandidate = {
  row: Record<string, unknown> & { sessionUpdate: SessionUpdateKind };
  toStreamEvent: (row: SessionUpdate) => FeedStreamEvent;
};
type CandidateResult = FeedCandidate | { rejection: string };
type CandidateInput = {
  feed: Feed;
  existing: SessionUpdate | undefined;
  revision: number;
  turnId: string | null;
};
const envelopeFields = new Set<string>([
  ...feedSetFields,
  'id',
  'sessionUpdate',
]);

const upsertPosition = (input: CandidateInput): number =>
  input.existing?.position ?? input.feed.nextPosition;
const upsertCandidate = (
  input: CandidateInput,
  change: FeedUpsert,
): FeedCandidate => ({
  row: {
    ...change.update,
    sessionId: input.feed.sessionId,
    position: upsertPosition(input),
    revision: input.revision,
    turnId: input.existing ? input.existing.turnId : input.turnId,
  },
  toStreamEvent: (row) => ({ type: 'row.upsert', rev: input.revision, row }),
});
const prepareUpsert = (
  input: CandidateInput,
  change: FeedUpsert,
): CandidateResult => {
  if (
    input.existing &&
    input.existing.sessionUpdate !== change.update.sessionUpdate
  )
    return {
      rejection: `row ${change.update.id} is ${input.existing.sessionUpdate}, not ${change.update.sessionUpdate}`,
    };
  return upsertCandidate(input, change);
};
const appendCandidate = (
  input: CandidateInput & { existing: SessionUpdate },
  change: Extract<FeedChange, { type: 'append' }>,
  current: string,
): FeedCandidate => ({
  row: {
    ...input.existing,
    ...writeFeedRowField(input.existing, change.field, current + change.text),
    revision: input.revision,
  },
  toStreamEvent: () =>
    appendStreamEvent(input.revision, change, current.length),
});
const appendStreamEvent = (
  revision: number,
  change: Extract<FeedChange, { type: 'append' }>,
  offset: number,
): FeedStreamEvent => ({
  type: 'row.append',
  rev: revision,
  id: change.id,
  field: change.field,
  off: offset,
  text: change.text,
});
const prepareAppend = (
  input: CandidateInput,
  change: Extract<FeedChange, { type: 'append' }>,
): CandidateResult => {
  if (!input.existing) return { rejection: `no row ${change.id}` };
  return prepareExistingAppend({ ...input, existing: input.existing }, change);
};
const prepareExistingAppend = (
  input: CandidateInput & { existing: SessionUpdate },
  change: Extract<FeedChange, { type: 'append' }>,
): CandidateResult => {
  const path = change.field.split('.');
  if (envelopeFields.has(path[0] ?? ''))
    return {
      rejection: `${change.field} of row ${change.id} is set by the Feed`,
    };
  return prepareStringAppend(
    input,
    change,
    readFeedField(input.existing, path),
  );
};
const prepareStringAppend = (
  input: CandidateInput & { existing: SessionUpdate },
  change: Extract<FeedChange, { type: 'append' }>,
  current: unknown,
): CandidateResult => {
  if (typeof current !== 'string')
    return { rejection: `${change.field} of row ${change.id} is not a string` };
  return appendCandidate(input, change, current);
};
const patchCandidate = (
  input: CandidateInput & { existing: SessionUpdate },
  change: Extract<FeedChange, { type: 'patch' }>,
): FeedCandidate => ({
  row: { ...input.existing, ...change.set, revision: input.revision },
  toStreamEvent: (row) => ({
    type: 'row.patch',
    rev: input.revision,
    id: change.id,
    set: Object.hasOwn(change.set, '_meta')
      ? { ...change.set, _meta: row._meta }
      : change.set,
  }),
});
const preparePatch = (
  input: CandidateInput,
  change: Extract<FeedChange, { type: 'patch' }>,
): CandidateResult => {
  if (!input.existing) return { rejection: `no row ${change.id}` };
  const envelopeField = Object.keys(change.set).find((key) =>
    envelopeFields.has(key),
  );
  if (envelopeField)
    return {
      rejection: `${envelopeField} of row ${change.id} is set by the Feed`,
    };
  return patchCandidate({ ...input, existing: input.existing }, change);
};
export const prepareFeedCandidate = (
  input: CandidateInput,
  change: FeedChange,
): CandidateResult => {
  if (change.type === 'upsert') return prepareUpsert(input, change);
  if (change.type === 'append') return prepareAppend(input, change);
  return preparePatch(input, change);
};
