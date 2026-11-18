import { expect, it } from 'vitest';
import { toolCallFacts } from './feed-row-facts';
import { call } from './feed-row-facts.mocks';
import { operationRecords, presentOperation } from './operation-records';
import { toolCallTitle } from './tool-call-title';

const server = 'argo-688241988e5d4453b682b7a37ad4ac62';

const input = { id: 'session.feed', params: { limit: 2 } };

const wrapped = { server, tool: 'operation_run', arguments: input };

it.each([
  { name: 'session.feed', rawInput: input.params },
  { name: 'operation_run', rawInput: input },
  { name: `${server}: operation_run`, rawInput: wrapped },
])('names and illustrates Session messages for $name', (fields) => {
  const row = call({ ...fields, title: 'MCP call', kind: 'execute' });

  expect(toolCallTitle(row)).toBe('Read Session messages');
  expect(toolCallTitle(row, true)).toBe('Read Session messages');
  expect(toolCallFacts(row).operation?.icon).toBe('message');
});

it.each([
  { ...wrapped, server: 'another-server' },
  { ...wrapped, arguments: { id: 'unknown.operation' } },
])('uses the generic Tool presentation for %j', (rawInput) => {
  const row = call({
    name: 'operation_run',
    title: 'MCP call',
    kind: 'execute',
    rawInput,
  });

  expect(toolCallTitle(row)).toBe('MCP call');
  expect(toolCallFacts(row).operation?.icon).toBeUndefined();
});

it('names discovery and waiting calls', () => {
  const discovery = call({
    name: 'operation_list',
    rawInput: { filter: 'session' },
  });

  const waiting = call({
    name: 'operation_run',
    rawInput: { ...wrapped, arguments: { waitId: 'work' } },
  });

  expect(toolCallTitle(discovery)).toBe('Discover Operations');
  expect(toolCallFacts(discovery).operation?.icon).toBe('search');
  expect(toolCallTitle(waiting)).toBe('Wait for Operation');
  expect(toolCallFacts(waiting).operation?.icon).toBe('clock');
});

it('shares a recorded Plugin Operation label and icon with its Agent call', () => {
  const name = 'github.discover';

  const agent = call({
    name: 'operation_run',
    rawInput: { ...wrapped, arguments: { id: name } },
    title: 'operation_run',
  });

  const engine = call({
    id: 'argo:plugin-call',
    toolCallId: 'plugin-call',
    name,
    title: 'Find pull requests',
    _meta: { argo: { operationIcon: 'pull-request' } },
  });

  const records = operationRecords([agent, engine]);
  const shown = presentOperation(agent, records);

  expect(toolCallTitle(shown)).toBe('Find pull requests');
  expect(toolCallFacts(shown).operation?.icon).toBe('pull-request');
  expect(shown.rawInput).toBe(agent.rawInput);
  expect(presentOperation(agent, records)).toBe(shown);
  expect(
    presentOperation({ ...agent, turnId: 'other-turn' }, records).title,
  ).toBe('operation_run');
});
