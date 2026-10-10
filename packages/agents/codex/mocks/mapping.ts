import type { AgentEvent, FeedUpdate } from '../../src/agent-events';
import type { VendorMessage } from '../messages';
import { responses as compaction } from '../mocks/compaction';
import { responses as edits } from '../mocks/edit-and-command';
import { responses as changes } from '../mocks/file-change';
import { responses as interrupt } from '../mocks/interrupt';
import { responses as reply } from '../mocks/reply';
import type { CommandAction as SuppliedCommandAction } from '../protocol.gen';
import { initialMappingState, toAgentEvents } from '../to-agent-events';

export const editCommandFixture = 'edit-and-command';
export const agentFeedEvent = 'agent.feed';
export const vendorSessionId = '01a10f63-35db-7062-a47d-ebd815c1bea2';
export const appFilePath = '/repo/app.txt';
export const agentTurnEndedEvent = 'agent.turnEnded';
export const thoughtTurnId = 'thought-turn';
export const checkFilesPrompt = 'Check the files.';

const fixtures: Record<string, VendorMessage[]> = {
  compaction,
  [editCommandFixture]: edits,
  'file-change': changes,
  interrupt,
  reply,
};
const responses = (name: string): VendorMessage[] => {
  const messages = fixtures[name];
  if (!messages) throw new Error(`Missing provider fixture: ${name}`);
  return messages;
};
export const mapMessages = (messages: VendorMessage[]): AgentEvent[] => {
  let state = initialMappingState();
  return messages.flatMap((message): AgentEvent[] => {
    const result = toAgentEvents(message, state);
    state = result.mappingState;
    return result.events;
  });
};
export const mapResponses = (name: string): AgentEvent[] =>
  mapMessages(responses(name));
const replaceCommandActions = <
  Notification extends Extract<
    VendorMessage,
    { method: 'item/started' | 'item/completed' }
  >['params'],
>(
  notification: Notification,
  commandActions: SuppliedCommandAction[],
): Notification => ({
  ...notification,
  item: { ...notification.item, commandActions },
});
type ItemNotification = Extract<
  VendorMessage,
  { method: 'item/started' | 'item/completed' }
>;
const replaceActions = (
  message: ItemNotification,
  commandActions: SuppliedCommandAction[],
): VendorMessage => {
  if (message.params.item.type !== 'commandExecution') return message;
  if (message.method === 'item/started')
    return {
      ...message,
      params: replaceCommandActions(message.params, commandActions),
    };
  return {
    ...message,
    params: replaceCommandActions(message.params, commandActions),
  };
};
export const withCommandActions = (
  commandActions: SuppliedCommandAction[],
): VendorMessage[] =>
  responses(editCommandFixture).map((message): VendorMessage =>
    message.method === 'item/started' || message.method === 'item/completed'
      ? replaceActions(message, commandActions)
      : message,
  );
export const upsertRows = (events: AgentEvent[]): FeedUpdate[] =>
  events.flatMap((event): FeedUpdate[] => {
    if (event.type !== agentFeedEvent) return [];
    return event.change.type === 'upsert' ? [event.change.update] : [];
  });
export const settledRows = (events: AgentEvent[]): FeedUpdate[] =>
  upsertRows(events).filter((row): boolean => row.state === 'settled');
