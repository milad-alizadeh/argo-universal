import type { AcpSessionLease } from '../src/agents';
import {
  modelShellChanged,
  modelSubagentUpdate,
  modelCheckoutCreated,
  modelCheckoutFailures,
  modelSessionLoaded,
} from './acp-model-events-1';
import {
  modelLifecycleEvents,
  modelPromptCommitted,
  modelPromptEvents,
  modelUsageUpdate,
} from './acp-model-events-2';
import {
  modelConfigurationUpdate,
  modelAgentMessage,
  modelRequestEvents,
  modelAcpOpened,
  modelCloseEvents,
} from './acp-model-events-3';
import type { AcpModelEvent, AcpModelSnapshot } from './acp-session-model';

export const modelEvents = (
  initial: AcpModelSnapshot,
  data: AcpModelSnapshot['context'],
  lease: AcpSessionLease,
): AcpModelEvent[] => [
  ...openingEvents(initial, data, lease),
  ...turnEvents(initial, lease),
];

const openingEvents = (
  initial: AcpModelSnapshot,
  data: AcpModelSnapshot['context'],
  lease: AcpSessionLease,
): AcpModelEvent[] => [
  modelShellChanged(initial),
  modelSubagentUpdate(lease),
  modelCheckoutCreated(data),
  ...modelCheckoutFailures,
  modelSessionLoaded(data),
  ...modelLifecycleEvents,
  modelPromptCommitted(lease),
  ...modelPromptEvents,
];

const turnEvents = (
  initial: AcpModelSnapshot,
  lease: AcpSessionLease,
): AcpModelEvent[] => [
  modelUsageUpdate(lease),
  modelConfigurationUpdate(lease),
  modelAgentMessage(lease),
  ...modelRequestEvents,
  modelAcpOpened(initial, lease),
  ...modelCloseEvents,
];
