import type { AgentMapping } from '../src/agent-adapter';
import type { AgentEvent, FeedUpdate } from '../src/agent-events';
import { dropped, upsert } from './feed-rows';
import type { MappingState } from './mapping-state';
import type { SDKMessage } from './messages';
type SystemMessage = Extract<SDKMessage, { type: 'system' }>;
type Notice = Extract<FeedUpdate, { sessionUpdate: 'notice' }>;
type NoticeContent = Omit<Notice, 'id' | 'sessionUpdate' | 'state'>;
export function mapNotice(
  message: SystemMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  const compacted = mapCompaction(message, state);
  return compacted ?? mapOrdinaryNotice(message, state);
}
function mapOrdinaryNotice(
  message: SystemMessage,
  state: MappingState,
): AgentMapping<MappingState> {
  const content = readNoticeContent(message);
  return content
    ? {
        events: [upsert(noticeRow(message.uuid, content))],
        mappingState: state,
      }
    : dropped(state);
}
function readNoticeContent(message: SystemMessage): NoticeContent | undefined {
  if (message.subtype === 'api_retry') return mapRetryNotice(message);
  if (message.subtype === 'hook_response') return mapHookNotice(message);
  return mapTextNotice(message);
}
function mapTextNotice(message: SystemMessage): NoticeContent | undefined {
  if (message.subtype === 'local_command_output')
    return { severity: 'info', title: message.content };
  if (message.subtype === 'notification')
    return { severity: 'info', title: message.text };
  return mapInformationalNotice(message);
}
function noticeRow(id: string, content: NoticeContent): Notice {
  return { id, sessionUpdate: 'notice', state: 'settled', ...content };
}
function mapCompaction(
  message: SystemMessage,
  state: MappingState,
): AgentMapping<MappingState> | undefined {
  if (message.subtype === 'compact_boundary')
    return compacted(message.uuid, state);
  if (message.subtype === 'status') return compactionStatus(message, state);
  return undefined;
}
function compacted(
  uuid: string,
  state: MappingState,
): AgentMapping<MappingState> {
  return {
    events: [compaction(state.compactionId ?? uuid, 'settled', 'completed')],
    mappingState: { ...state, compactionId: null },
  };
}
function compactionStatus(
  message: Extract<SystemMessage, { subtype: 'status' }>,
  state: MappingState,
): AgentMapping<MappingState> | undefined {
  if (message.status === 'compacting') {
    const id = state.compactionId ?? message.uuid;
    return {
      events: [compaction(id, 'open', 'in_progress')],
      mappingState: { ...state, compactionId: id },
    };
  }
  return failedCompaction(message, state);
}
function failedCompaction(
  message: Extract<SystemMessage, { subtype: 'status' }>,
  state: MappingState,
): AgentMapping<MappingState> | undefined {
  if (message.compact_result !== 'failed' || state.compactionId === null)
    return undefined;
  return {
    events: [compaction(state.compactionId, 'settled', 'failed')],
    mappingState: { ...state, compactionId: null },
  };
}
function mapRetryNotice(
  message: Extract<SystemMessage, { subtype: 'api_retry' }>,
): NoticeContent {
  return {
    severity: 'warning',
    title: `Retrying (${message.attempt} of ${message.max_retries})`,
    _meta: retryMetadata(message),
  };
}
function mapInformationalNotice(
  message: SystemMessage,
): NoticeContent | undefined {
  if (message.subtype !== 'informational') return undefined;
  return {
    severity: message.level === 'warning' ? 'warning' : 'info',
    title: message.content,
  };
}
function mapHookNotice(
  message: Extract<SystemMessage, { subtype: 'hook_response' }>,
): NoticeContent | undefined {
  if (message.outcome !== 'error') return undefined;
  return {
    severity: 'warning',
    title: `Hook ${message.hook_name} failed`,
    ...hookDescription(message.stderr),
  };
}
function hookDescription(stderr: string): Pick<Notice, 'description'> {
  return stderr ? { description: stderr } : {};
}
export function compaction(
  id: string,
  state: 'open' | 'settled',
  status: Extract<FeedUpdate, { sessionUpdate: 'compaction_update' }>['status'],
): AgentEvent {
  return upsert({
    id,
    compactionId: id,
    sessionUpdate: 'compaction_update',
    state,
    status,
  });
}

function retryMetadata(
  message: Extract<SystemMessage, { subtype: 'api_retry' }>,
): Notice['_meta'] {
  return {
    argo: {
      retry: {
        attempt: message.attempt,
        maxAttempts: message.max_retries,
        delayMs: message.retry_delay_ms,
      },
    },
  };
}
