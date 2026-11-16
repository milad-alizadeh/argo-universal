import { expect, it } from 'vitest';
import { SubagentRole } from '../feed/subagent-role';
import { pluginInstructionsLimit } from '../plugins/manifest-fields';
import { todoOperationIds } from '../sessions/todos';
import {
  argoInstructions,
  argoInstructionsMarkdown,
  chosenArgoInstructions,
} from './argo-instructions';

it('keeps each Argo instruction within the Plugin instructions limit', () => {
  const over = argoInstructions.filter(
    ({ text }) => text.length > pluginInstructionsLimit,
  );

  expect(over).toEqual([]);
});

it('asks the Agent to keep a Todo list', () => {
  expect(argoInstructions.map(({ name }) => name)).toContain('Todo list');
});

it('asks the Agent to declare the role of each Agent it spawns, naming the tool that runs it', () => {
  const agents = argoInstructions.find(({ name }) => name === 'Agents')?.text;

  expect(agents).toContain('session.declareSubagentRole');
  expect(agents).toContain('operation_run');
});

// A `timeout` killed a start still waiting on the person, and each retry asked again and started a duplicate.
it('tells the Agent to wait for session.new instead of timing it out or retrying it', () => {
  const agents = argoInstructions.find(({ name }) => name === 'Agents')?.text;

  expect(agents).toContain('session.new');
  expect(agents).toContain('timeout');
  expect(agents).toContain('retry');
});

it('names every Agent role the Agent can declare', () => {
  const agents = argoInstructions.find(({ name }) => name === 'Agents')?.text;

  expect(SubagentRole.options).toContain('implement');

  for (const role of SubagentRole.options) expect(agents).toContain(role);
});

// The Agent runs both Operations with no discovery call, so the instruction carries their ids and the tool that runs them.
it('gives the Agent the Operations that keep the Todo list and the tool that runs them', () => {
  const todoList = argoInstructions.find(
    ({ name }) => name === 'Todo list',
  )?.text;

  for (const word of [...todoOperationIds, 'operation_run', 'ToolSearch'])
    expect(todoList).toContain(word);
});

it("names no Agent's own checklist tool", () => {
  const todoList = argoInstructions.find(
    ({ name }) => name === 'Todo list',
  )?.text;

  for (const tool of ['TaskCreate', 'TodoWrite', 'update_plan'])
    expect(todoList).not.toContain(tool);
});

it('leaves the Todo list instruction out when the person turned the Todo list off', () => {
  expect(
    chosenArgoInstructions({ todoList: false }).map(({ name }) => name),
  ).toEqual(['Agents']);
  expect(argoInstructionsMarkdown({ todoList: false })).not.toContain(
    'session.setTodos',
  );
  expect(argoInstructionsMarkdown()).toContain('session.setTodos');
});
