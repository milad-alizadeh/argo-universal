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
  PromptMessage,
  SessionMessage,
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
  PromptMessage.omit(withoutEnvelope),
  SessionMessage.omit(withoutEnvelope),
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

// A step on a dotted Feed path such as `content.0.text`: text ends it, a list or record leads on.
const FeedRecord = z.record(z.string(), z.unknown());

const FeedNode = z.union([z.string(), z.array(z.unknown()), FeedRecord]);

type FeedRecord = z.infer<typeof FeedRecord>;

type FeedNode = z.infer<typeof FeedNode>;

type FeedBranch = Exclude<FeedNode, string>;

function entryNode(branch: FeedBranch, key: string): FeedNode | undefined {
  const entry = Array.isArray(branch) ? branch[Number(key)] : branch[key];

  return FeedNode.safeParse(entry).data;
}

// The text, list or record under `key`; undefined when the path leads nowhere.
function childNode(
  node: FeedNode | undefined,
  key: string,
): FeedNode | undefined {
  if (typeof node !== 'object' || !Object.hasOwn(node, key)) return undefined;

  return entryNode(node, key);
}

// The text, list or record at a dotted path; undefined when the path leads nowhere or ends at another value.
export function readFeedField(
  row: SessionUpdate,
  path: readonly string[],
): FeedNode | undefined {
  let node: FeedNode | undefined = row;

  for (const key of path) node = childNode(node, key);

  return node;
}

function writeBranch(
  branch: FeedBranch,
  key: string,
  value: FeedNode,
): FeedBranch {
  if (!Array.isArray(branch)) return { ...branch, [key]: value };
  const copy = [...branch];
  copy[Number(key)] = value;

  return copy;
}

// A copy of `node` with `text` at a path that `readFeedField` resolved.
function writeFeedField(
  node: FeedNode | undefined,
  [key, ...rest]: readonly string[],
  text: string,
): FeedNode {
  if (key === undefined) return text;

  if (typeof node !== 'object')
    throw new TypeError(
      'A resolved Feed path needs a list or record before its text',
    );

  const child = writeFeedField(childNode(node, key), rest, text);

  return writeBranch(node, key, child);
}

// The top-level field of `row` that holds `field`, with `text` written at its path.
export function writeFeedRowField(
  row: SessionUpdate,
  field: string,
  text: string,
): FeedRecord {
  const [key = '', ...rest] = field.split('.');

  return { [key]: writeFeedField(childNode(row, key), rest, text) };
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
