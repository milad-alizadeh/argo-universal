import { expect, it } from 'vitest';
import { diagramTones, supportedDiagramKeywords } from '../diagram';
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

// A `timeout` killed a start still waiting on the person, and each retry asked again and started a duplicate.
it('tells the Agent to wait for session.new instead of timing it out or retrying it', () => {
  const agents = argoInstructions.find(({ name }) => name === 'Agents')?.text;

  expect(agents).toContain('session.new');
  expect(agents).toContain('timeout');
  expect(agents).toContain('retry');
});

// Agents spent 20 to 30 seconds finding session.new and their own Project before starting a Session.
it('gives the Agent session.new with the one param it needs', () => {
  const agents = argoInstructions.find(({ name }) => name === 'Agents')?.text;

  expect(agents).toContain('session.new with params {"prompt"');
});

it('puts the Operation catalog before the Argo instructions', () => {
  expect(argoInstructionsMarkdown()).toMatch(
    /^## Operations\n\n[\s\S]*- session\.rename\(title, sessionId\?\)[\s\S]*## Todo list/,
  );
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
  const names = argoInstructions.map(({ name }) => name);

  expect(
    chosenArgoInstructions({ todoList: false }).map(({ name }) => name),
  ).toEqual(names.filter((name) => name !== 'Todo list'));
  expect(argoInstructionsMarkdown({ todoList: false })).not.toContain(
    'session.setTodos',
  );
  expect(argoInstructionsMarkdown()).toContain('session.setTodos');
});

// Accepted by the renderer but deliberately not advertised: the instruction names only the canonical keyword.
const unadvertisedDiagramAliases = {
  graph: 'flowchart',
  stateDiagram: 'stateDiagram-v2',
};

it('asks the Agent to validate each diagram, naming the Operation and every tone it may mark a node with', () => {
  const diagrams = argoInstructions.find(
    ({ name }) => name === 'Diagrams',
  )?.text;

  expect(diagrams).toContain('diagram.validate');
  expect(diagrams).toContain('operation_run');

  for (const tone of diagramTones) expect(diagrams).toContain(tone);
});

it('names every diagram keyword Argo draws, except the aliases it leaves unadvertised', () => {
  const diagrams = argoInstructions.find(
    ({ name }) => name === 'Diagrams',
  )?.text;

  const advertised = supportedDiagramKeywords.filter(
    (keyword) => !(keyword in unadvertisedDiagramAliases),
  );

  for (const keyword of advertised) expect(diagrams).toContain(keyword);
});

it('keeps each unadvertised diagram alias pointing at a keyword the instruction names', () => {
  const diagrams = argoInstructions.find(
    ({ name }) => name === 'Diagrams',
  )?.text;

  for (const [alias, target] of Object.entries(unadvertisedDiagramAliases)) {
    expect(supportedDiagramKeywords).toContain(alias);
    expect(supportedDiagramKeywords).toContain(target);
    expect(diagrams).toContain(target);
  }
});

// `gh pr create` alone left each pull request unattached to the Session.
it('asks the Agent to attach each pull request it opens, naming both Operations and the tool that runs them', () => {
  const pullRequests = argoInstructions.find(
    ({ name }) => name === 'Pull requests',
  )?.text;

  for (const word of ['github.discover', 'github.attach', 'operation_run'])
    expect(pullRequests).toContain(word);
});

it('asks the Agent to preview its exact Chart fence before sending it', () => {
  const charts = argoInstructions.find(({ name }) => name === 'Charts')?.text;

  for (const phrase of [
    'Agent messages',
    'chart.preview',
    'operation_run',
    'operation_list',
  ])
    expect(charts).toContain(phrase);
});
