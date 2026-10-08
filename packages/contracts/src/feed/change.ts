import { z } from 'zod';
import { feedRowColumns } from '../columns';
import {
  AgentMessage,
  AgentThought,
  CompactionUpdate,
  Notice,
  PlanUpdate,
  SubagentUpdate,
  type SessionUpdate,
  TaskUpdate,
  ToolCallUpdate,
  UserMessage,
} from './session-update';

// The Feed actor sets these envelope fields, so a change never carries them.
const withoutEnvelope = {
  sessionId: true,
  position: true,
  revision: true,
  turnId: true,
} as const;
export const feedSetFields = Object.keys(withoutEnvelope).filter(
  (key): key is keyof typeof withoutEnvelope =>
    Object.hasOwn(withoutEnvelope, key),
);

// A Session update as an Agent reports it: a row without the fields the Feed actor sets.
export const FeedUpdate = z.discriminatedUnion('sessionUpdate', [
  UserMessage.omit(withoutEnvelope),
  AgentMessage.omit(withoutEnvelope),
  AgentThought.omit(withoutEnvelope),
  ToolCallUpdate.omit(withoutEnvelope),
  PlanUpdate.omit(withoutEnvelope),
  CompactionUpdate.omit(withoutEnvelope),
  SubagentUpdate.omit(withoutEnvelope),
  Notice.omit(withoutEnvelope),
  TaskUpdate.omit(withoutEnvelope),
]);
export type FeedUpdate = z.infer<typeof FeedUpdate>;

// The whole row, new or replaced; `state: 'settled'` settles it.
export const FeedUpsert = z.strictObject({
  type: z.literal('upsert'),
  update: FeedUpdate,
});
export type FeedUpsert = z.infer<typeof FeedUpsert>;

// Text added to the end of the string at `field`, a dotted path such as `content.0.text`.
export const FeedAppend = z.strictObject({
  type: z.literal('append'),
  id: feedRowColumns.shape.id,
  field: z.string(),
  text: z.string(),
});
export type FeedAppend = z.infer<typeof FeedAppend>;

// The value at a dotted path such as `content.0.text`, or undefined when the path leads nowhere.
export function readFeedField(
  value: unknown,
  path: readonly string[],
): unknown {
  let current = value;
  for (const key of path) {
    if (Array.isArray(current) && /^\d+$/.test(key))
      current = current[Number(key)];
    else if (
      current !== null &&
      typeof current === 'object' &&
      Object.hasOwn(current, key)
    )
      current = Reflect.get(current, key);
    else return undefined;
  }
  return current;
}

// A copy of `value` with `text` at a path that `readFeedField` resolved.
export function writeFeedField(
  value: unknown,
  [key, ...rest]: readonly string[],
  text: string,
): unknown {
  if (key === undefined) return text;
  if (Array.isArray(value)) {
    const copy = [...value];
    copy[Number(key)] = writeFeedField(value[Number(key)], rest, text);
    return copy;
  }
  if (value === null || typeof value !== 'object')
    throw new TypeError('A resolved Feed path needs an object before its text');
  return {
    ...value,
    [key]: writeFeedField(Reflect.get(value, key), rest, text),
  };
}

export function writeFeedRowField(
  value: SessionUpdate,
  field: string,
  text: string,
): Record<string, unknown> {
  const [key = '', ...rest] = field.split('.');
  return {
    ...value,
    [key]: writeFeedField(Reflect.get(value, key), rest, text),
  };
}

// Top-level fields of a row to replace; `state: 'settled'` settles it.
export const FeedPatch = z.strictObject({
  type: z.literal('patch'),
  id: feedRowColumns.shape.id,
  set: z.record(z.string(), z.unknown()),
});
export type FeedPatch = z.infer<typeof FeedPatch>;

// One change an Agent makes to a Session's Feed.
export const FeedChange = z.discriminatedUnion('type', [
  FeedUpsert,
  FeedAppend,
  FeedPatch,
]);
export type FeedChange = z.infer<typeof FeedChange>;
