import { operationCatalog } from '../operations/catalog';
import { todoOperationIds } from '../sessions/todos';

// Argo instructions (ADR-0053): core's own prose for every Session's Agent, sent before any Plugin's, in this order.
export type ArgoInstruction = { name: string; text: string };

// The Agent keeps its checklist through two Operations whose ids and params are given here, so it needs no `operation_list` first.
const todoList: ArgoInstruction = {
  name: 'Todo list',
  text:
    'Keep a Todo list for any task that changes files or takes more than one command, so the person sees what is done and left. ' +
    'Skip it only for questions that change nothing. ' +
    'Use the operation_run tool of the Argo MCP server, without operation_list. ' +
    'If it is not declared to you, load it with your tool search, such as `ToolSearch`, or find the tool ending in operation_run in `ALL_TOOLS` and call it from a code script; it can take seconds to start, so if missing, look again after your first command. ' +
    'Before your first change, run session.setTodos with params {"todos":[{"content":"A step in a few words"}]}, one entry per step in order; the first step starts by itself. ' +
    'Each time you finish a step, before the next, run session.setTodoStep with params {"step":1,"status":"completed"}: steps count from 1, completing a step completes those before it, and the next starts by itself. ' +
    'A status is pending, in_progress or completed. ' +
    'Run session.setTodos again only if the steps change. Leave sessionId out.',
};

// The spawn tools of most Agents cannot carry a role, so the Agent declares it to Argo first (#2075).
const agents: ArgoInstruction = {
  name: 'Agents',
  text:
    'Before you spawn a subagent, run the Argo Operation session.declareSubagentRole with its role, through the operation_run tool of the Argo MCP server: ' +
    'explore to search or read code, plan to design an approach, review to check work against a spec or standards, ' +
    'test to write or run tests, implement to write or change code, or general for anything else. ' +
    'Declare one role per subagent, in the order you spawn them; leave sessionId out. ' +
    'Argo draws that role for the Agent in the Feed and the Agents list. ' +
    'To start a Session, run session.new with params {"prompt":[{"type":"text","text":"The task"}]}; it starts in this Project with your Agent. ' +
    'Wait for its result: it may wait for the person to allow it. ' +
    'Never wrap it in a timeout and never retry it, because each retry asks the person again and starts another Session.',
};

// The Feed draws Mermaid fences as diagrams, with a renderer that skips what it cannot read (ADR-0058).
const diagrams: ArgoInstruction = {
  name: 'Diagrams',
  text:
    'Argo draws ```mermaid fences as diagrams: flowchart, sequenceDiagram, stateDiagram-v2, classDiagram and erDiagram. ' +
    'Before you send one, run the Argo Operation diagram.validate with its source, through the operation_run tool of the Argo MCP server, ' +
    'and fix every problem it reports until it passes. ' +
    'Name a diagram with front matter (---, title: Name, ---). ' +
    'Argo colours every diagram itself, so leave out style, classDef, linkStyle and init colours; ' +
    'to mark a node, give it a tone class such as `class A success`: info, success, warning, danger, done or muted.',
};

// `gh pr create` leaves a pull request unattached, so the Agent attaches it itself.
const pullRequests: ArgoInstruction = {
  name: 'Pull requests',
  text:
    'Right after you open a pull request, in the same turn and before you report it done, attach it to this Session: ' +
    'run the Argo Operation github.discover through the operation_run tool of the Argo MCP server, with params {"unlessAttached":false} and wait true. ' +
    '`gh pr create` alone does not attach it. ' +
    'discover finds the pull requests of this Session\'s current branch; for one opened from another branch, run github.attach with params {"reference":"owner/repo#123"}. ' +
    'Say that it attached.',
};

export const argoInstructions: readonly ArgoInstruction[] = [
  todoList,
  agents,
  diagrams,
  pullRequests,
];

// What the person's settings leave of the Argo instructions for one Session.
export type ArgoInstructionChoices = { todoList: boolean };

// The Argo instructions a Session gets: all of them, less the checklist's when the person turned it off.
export const chosenArgoInstructions = (
  choices: ArgoInstructionChoices,
): readonly ArgoInstruction[] =>
  choices.todoList
    ? argoInstructions
    : argoInstructions.filter((instruction) => instruction !== todoList);

// The Operation catalog, first, so an Agent runs an Operation without discovery calls; the checklist's leave with its instruction.
export const operationsSection = (
  choices: ArgoInstructionChoices = { todoList: true },
): string =>
  `## Operations\n\n${operationCatalog({
    hidden: new Set(choices.todoList ? [] : todoOperationIds),
  })}`;

// The catalog, then each chosen Argo instruction under its name, as one block of Markdown.
export const argoInstructionsMarkdown = (
  choices: ArgoInstructionChoices = { todoList: true },
): string =>
  [
    operationsSection(choices),
    ...chosenArgoInstructions(choices).map(
      ({ name, text }) => `## ${name}\n\n${text}`,
    ),
  ].join('\n\n');
