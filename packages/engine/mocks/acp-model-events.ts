import type { AcpSessionLease } from '../src/agents';
import {
  modelLifecycleEvents,
  modelPromptCommitted,
  modelPromptEvents,
  modelUsageUpdate,
} from './acp-model-lifecycle-events';
import {
  modelConfigurationUpdate,
  modelAgentMessage,
  modelRequestEvents,
  modelAcpOpened,
  modelCloseEvents,
} from './acp-model-request-events';
import {
  modelShellChanged,
  modelSubagentUpdate,
  modelCheckoutCreated,
  modelCheckoutFailures,
  modelSessionLoaded,
} from './acp-model-start-events';
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
  ...cloneModelEvents(modelCheckoutFailures),
  modelSessionLoaded(data),
  ...cloneModelEvents(modelLifecycleEvents),
  modelPromptCommitted(lease),
  ...cloneModelEvents(modelPromptEvents),
];

const turnEvents = (
  initial: AcpModelSnapshot,
  lease: AcpSessionLease,
): AcpModelEvent[] => [
  modelUsageUpdate(lease),
  modelConfigurationUpdate(lease),
  modelAgentMessage(lease),
  ...cloneModelEvents(modelRequestEvents),
  modelAcpOpened(initial, lease),
  ...cloneModelEvents(modelCloseEvents),
];

// Each model owns its event payloads, including error objects, just as it owns its paths.
const cloneModelEvents = (events: AcpModelEvent[]): AcpModelEvent[] =>
  structuredClone(events);
