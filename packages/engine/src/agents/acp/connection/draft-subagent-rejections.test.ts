import type { AnyMessage } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import {
  ending,
  notification,
  spawn,
  standard,
  translate,
} from './draft-subagent-fixtures';

it.each([
  { label: 'a state no Agent sends', message: ending('paused') },
  {
    label: 'a spawn without a child id',
    message: notification({ ...spawn, subagentSessionId: undefined }),
  },
  {
    label: 'a spawn with a non-text name',
    message: notification({ ...spawn, name: 42 }),
  },
  {
    label: 'a spawn with capabilities it does not know',
    message: notification({ ...spawn, capabilities: { resume: {} } }),
  },
])('rejects, reports and counts $label', ({ message }) => {
  const { messages, rejected, reports } = translate(message);

  expect(messages).toEqual([]);
  expect(rejected).toBe(1);
  expect(reports).toHaveLength(1);
});

it.each([
  notification({
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text: 'Hello' },
  }),
  standard({
    sessionUpdate: 'subagent_update',
    sessionId: 'child',
    state: { state: 'running' },
  }),
  { jsonrpc: '2.0', method: 'future/update', params: { anything: 'allowed' } },
] satisfies AnyMessage[])('passes %j through untouched', (message) => {
  const { messages, rejected } = translate(message);

  expect(messages).toEqual([message]);
  expect(rejected).toBe(0);
});
