import { expect, it } from 'vitest';
import { listOperations } from './search';

// What Agents and Voice calls ask `operation_list` for, in their own words, by the Operation each one means.
const asked = {
  'session.new': [
    'start a new session',
    'new session',
    'create a session',
    'launch a session in a worktree',
    'session.new',
    'newsession',
  ],
  'session.prompt': ['send a message to a session', 'prompt another session'],
  'session.cancel': ['stop the running turn', 'cancel session'],
  'session.rename': ['rename session', 'change the session title'],
  'session.archive': ['archive this session', 'archve sesison'],
  'session.unarchive': ['restore an archived session'],
  'session.list': ['list sessions', 'sesion list', 'listsessions'],
  'session.diff': ['show the diff'],
  'session.changes': ['which files changed'],
  'session.feed': ['read session messages'],
  'session.get': ['session status'],
  'session.setTodos': ['set the todo list', 'todolist'],
  'session.setTodoStep': ['mark step done', 'complete a todo step'],
  'session.setConfigOption': ['switch model'],
  'session.clear': ['clear context'],
  'session.reload': ['restart the agent'],
  'session.declareSubagentRole': ['declare subagent role'],
  'voice.hangUp': ['hang up', 'end the call', 'goodbye', 'hangup'],
  'voice.setVoice': ['change voice'],
  'voice.chooseDevices': ['pick a microphone'],
  'project.list': ['list projects', 'PROJECT.LIST'],
  'project.clone': ['clone a repo from github'],
  'project.add': ['add a project folder'],
  'agent.install': ['install an agent'],
  'agent.remove': ['uninstall agent'],
  'diagram.validate': ['validate mermaid diagram', 'check my flowchart'],
  'plugin.guide': ['build a plugin'],
  'plugin.setEnabled': ['disable a plugin'],
  'app.open': ['open a screen in the app'],
  'shell.stop': ['kill a terminal command'],
} satisfies Record<string, readonly string[]>;

const queries = Object.entries(asked).flatMap(([expected, phrases]) =>
  phrases.map((query) => [query, expected] as const),
);

const ranked = (query: string): string[] =>
  listOperations(query).map(({ id }) => id);

it.each(queries)('finds %s among the first three', (query, expected) => {
  expect(ranked(query).slice(0, 3)).toContain(expected);
});

it('puts the meant Operation first for nine queries in ten', () => {
  const missed = queries.filter(
    ([query, expected]) => ranked(query)[0] !== expected,
  );

  expect(missed.length / queries.length).toBeLessThanOrEqual(0.1);
});
