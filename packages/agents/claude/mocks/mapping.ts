import { SessionUpdate } from '@repo/contracts';
import type {
  FeedChange,
  FeedUpdate,
  AgentEvent,
} from '../../src/agent-events';
import type { VendorMessage, SDKResultMessage } from '../messages';
import {
  initialMappingState,
  toAgentEvents,
  type MappingState,
} from '../to-agent-events';
import { completed } from './sdk-result';
export function mapAll(
  messages: VendorMessage[],
  start = initialMappingState(),
): { events: AgentEvent[]; mappingState: MappingState } {
  let mappingState = start;
  const events = messages.flatMap((message): AgentEvent[] => {
    const result = toAgentEvents(message, mappingState);
    mappingState = result.mappingState;
    return result.events;
  });
  return { events, mappingState };
}
export const feedChanges = (
  events: ReturnType<typeof mapAll>['events'],
): FeedChange[] =>
  events.flatMap((event): FeedChange[] =>
    event.type === 'agent.feed' ? [event.change] : [],
  );
export function foldRows(changes: FeedChange[]): FeedUpdate[] {
  const rows = new Map<string, FeedUpdate>();
  for (const change of changes) applyChange(rows, change);
  return [...rows.values()];
}
function applyChange(rows: Map<string, FeedUpdate>, change: FeedChange): void {
  if (change.type === 'upsert') {
    rows.set(change.update.id, change.update);
    return;
  }
  const row = rows.get(change.id);
  if (!row) throw new Error(`No row ${change.id}`);
  rows.set(change.id, changedRow(row, change));
}
function changedRow(
  row: FeedUpdate,
  change: Exclude<FeedChange, { type: 'upsert' }>,
): FeedUpdate {
  if (change.type === 'patch')
    return parseFeedUpdate({ ...row, ...change.set });
  const copy: unknown = structuredClone(row);
  appendText(copy, change);
  return parseFeedUpdate(copy);
}
function appendText(
  copy: unknown,
  change: Extract<FeedChange, { type: 'append' }>,
): void {
  const keys = change.field.split('.');
  const last = keys.pop();
  if (!last) throw new Error('Empty append path');
  const target = keys.reduce<unknown>(
    (value, key): unknown => pathValue(value, key),
    copy,
  );
  if (!isRecord(target)) throw new Error('Invalid append target');
  appendField(target, last, change.text);
}
function pathValue(value: unknown, key: string): unknown {
  if (Array.isArray(value)) return value[Number(key)];
  if (isRecord(value)) return value[key];
  throw new Error('Invalid append path');
}
function parseFeedUpdate(value: unknown): FeedUpdate {
  if (!isRecord(value)) throw new Error('Invalid Feed row');
  const update = SessionUpdate.parse({
    ...value,
    sessionId: 'session-1',
    turnId: null,
    position: 0,
    revision: 0,
  });
  Reflect.deleteProperty(update, 'sessionId');
  Reflect.deleteProperty(update, 'turnId');
  Reflect.deleteProperty(update, 'position');
  Reflect.deleteProperty(update, 'revision');
  return update;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export const result = (
  fields: Partial<Extract<SDKResultMessage, { subtype: 'success' }>>,
): SDKResultMessage => ({ ...completed, ...fields });
export function failedResult(
  fields: Partial<Exclude<SDKResultMessage, { subtype: 'success' }>>,
): SDKResultMessage {
  const base = { ...completed };
  Reflect.deleteProperty(base, 'result');
  return { ...base, subtype: 'error_during_execution', errors: [], ...fields };
}

function appendField(
  target: Record<string, unknown>,
  last: string,
  text: string,
): void {
  const current = target[last];
  if (typeof current !== 'string') throw new Error('Invalid append text');
  target[last] = `${current}${text}`;
}
