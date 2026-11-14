// Argo instructions (ADR-0053): core's own prose for every Session's Agent, sent before any Plugin's, in this order.
export type ArgoInstruction = { name: string; text: string };

const plan: ArgoInstruction = {
  name: 'Plan',
  text:
    'When work takes three or more steps, write the steps as your Plan before you start, ' +
    'with the tool that keeps your todo list or plan. ' +
    'Keep one step in progress, mark each one done as you finish it, and add steps you discover. ' +
    'Argo shows the Plan to the person following the Session. ' +
    'Skip it for one-step work and for questions.',
};

// The spawn tools of most Agents cannot carry a role, so the Agent declares it to Argo first (#2075).
const agents: ArgoInstruction = {
  name: 'Agents',
  text:
    'Before you spawn a subagent, run the Argo Operation session.declareSubagentRole with its role: ' +
    'explore to search or read code, plan to design an approach, review to check work against a spec or standards, ' +
    'test to write or run tests, or general for anything else. ' +
    'Declare one role per subagent, in the order you spawn them; leave sessionId out. ' +
    'Argo draws that role for the Agent in the Feed and the Agents list.',
};

export const argoInstructions: readonly ArgoInstruction[] = [plan, agents];

// Each Argo instruction under its name, as one block of Markdown.
export const argoInstructionsMarkdown = (): string =>
  argoInstructions
    .map(({ name, text }) => `## ${name}\n\n${text}`)
    .join('\n\n');
