// Argo instructions (ADR-0053): core's own prose for every Session's Agent, sent before any Plugin's, in this order.
export type ArgoInstruction = { name: string; text: string };

// The Agent keeps its checklist through two Operations whose ids and params are given here, so it needs no `operation_list` first.
const todoList: ArgoInstruction = {
  name: 'Todo list',
  text:
    'When work takes three or more steps, keep a Todo list, so the person following the Session sees what is done and what is left. ' +
    'Use the operation_run tool of the Argo MCP server, with no operation_list first; if the tool is deferred, load it first, for example with `ToolSearch`. ' +
    'Before you start, run session.setTodos with params {"todos":[{"content":"A step in a few words"}]}, one entry per step in order; the first step starts by itself. ' +
    'As you finish each step, run session.setTodoStep with params {"step":1,"status":"completed"}: steps count from 1, and the next pending step starts by itself. ' +
    'A status is pending, in_progress or completed. ' +
    'Run session.setTodos again only when the steps themselves change. Leave sessionId out. ' +
    'Skip the Todo list for one-step work and for questions.',
};

// The spawn tools of most Agents cannot carry a role, so the Agent declares it to Argo first (#2075).
const agents: ArgoInstruction = {
  name: 'Agents',
  text:
    'Before you spawn a subagent, run the Argo Operation session.declareSubagentRole with its role, through the operation_run tool of the Argo MCP server: ' +
    'explore to search or read code, plan to design an approach, review to check work against a spec or standards, ' +
    'test to write or run tests, implement to write or change code, or general for anything else. ' +
    'Declare one role per subagent, in the order you spawn them; leave sessionId out. ' +
    'Argo draws that role for the Agent in the Feed and the Agents list.',
};

export const argoInstructions: readonly ArgoInstruction[] = [todoList, agents];

// What the person's settings leave of the Argo instructions for one Session.
export type ArgoInstructionChoices = { todoList: boolean };

// The Argo instructions a Session gets: all of them, less the checklist's when the person turned it off.
export const chosenArgoInstructions = (
  choices: ArgoInstructionChoices,
): readonly ArgoInstruction[] =>
  choices.todoList
    ? argoInstructions
    : argoInstructions.filter((instruction) => instruction !== todoList);

// Each chosen Argo instruction under its name, as one block of Markdown.
export const argoInstructionsMarkdown = (
  choices: ArgoInstructionChoices = { todoList: true },
): string =>
  chosenArgoInstructions(choices)
    .map(({ name, text }) => `## ${name}\n\n${text}`)
    .join('\n\n');
