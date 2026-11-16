import { expect, it } from 'vitest';
import { SubagentRole } from '../feed/subagent-role';
import { pluginInstructionsLimit } from '../plugins/manifest-fields';
import { argoInstructions } from './argo-instructions';

it('keeps each Argo instruction within the Plugin instructions limit', () => {
  const over = argoInstructions.filter(
    ({ text }) => text.length > pluginInstructionsLimit,
  );

  expect(over).toEqual([]);
});

it('asks the Agent to keep a Plan', () => {
  expect(argoInstructions.map(({ name }) => name)).toContain('Plan');
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

// Claude Code defers its task tools behind ToolSearch, and an unnamed tool went unused.
it('names the checklist tool of each Agent the Plan reaches', () => {
  const plan = argoInstructions.find(({ name }) => name === 'Plan')?.text;

  for (const tool of ['TaskCreate', 'TodoWrite', 'update_plan', 'ToolSearch'])
    expect(plan).toContain(tool);
});
