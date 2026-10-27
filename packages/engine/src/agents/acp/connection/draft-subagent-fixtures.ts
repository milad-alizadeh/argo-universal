import type { AnyMessage, SessionNotification } from '@agentclientprotocol/sdk';
import { createRejectionCounter } from '@repo/machine-log';
import { vi } from 'vitest';
import { createDraftSubagentTranslator } from './draft-subagent-updates';

// What an Agent may send for a draft update, including the shapes the translator must reject.
type DraftWire = {
  sessionUpdate: string;
  subagentSessionId?: string;
  name?: string | number;
  task?: string;
  prompt?: string;
  capabilities?: { resume?: Record<never, never> };
  state?: string;
};

export const notification = (
  update: DraftWire | SessionNotification['update'],
): AnyMessage => ({
  jsonrpc: '2.0',
  method: 'session/update',
  params: { sessionId: 'parent', update },
});

export const standard = notification;

export const spawn = {
  sessionUpdate: 'subagent_spawned',
  subagentSessionId: 'child',
  name: 'naming_audit',
  task: 'Audit the names',
  capabilities: {},
};

export const ending = (state: string): AnyMessage =>
  notification({
    sessionUpdate: 'subagent_state_update',
    subagentSessionId: 'child',
    state,
  });

type Translated = {
  messages: AnyMessage[];
  rejected: number;
  reports: unknown[];
};

export const translate = (message: AnyMessage): Translated => {
  using log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const rejections = createRejectionCounter('draft');
  const messages = createDraftSubagentTranslator(rejections)(message);

  return { messages, rejected: rejections.count(), reports: log.mock.calls };
};
