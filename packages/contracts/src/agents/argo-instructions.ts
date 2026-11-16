// Argo instructions (ADR-0053): core's own prose for every Session's Agent, sent before any Plugin's, in this order.
export type ArgoInstruction = { name: string; text: string };

const plan: ArgoInstruction = {
  name: 'Plan',
  text:
    'When work takes three or more steps, write the steps as your Plan before you start, ' +
    'with the tool that keeps your todo list or plan: ' +
    '`TaskCreate` and `TaskUpdate` (or `TodoWrite`) in Claude Code, `update_plan` in Codex. ' +
    'If the tool is deferred, load it first, for example with `ToolSearch`. ' +
    'Keep one step in progress, mark each one done as you finish it, and add steps you discover. ' +
    'Argo shows the Plan to the person following the Session. ' +
    'Skip it for one-step work and for questions.',
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
    'When you start a Session with session.new, wait for its result: it may wait for the person to allow it. ' +
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

export const argoInstructions: readonly ArgoInstruction[] = [
  plan,
  agents,
  diagrams,
];

// Each Argo instruction under its name, as one block of Markdown.
export const argoInstructionsMarkdown = (): string =>
  argoInstructions
    .map(({ name, text }) => `## ${name}\n\n${text}`)
    .join('\n\n');
