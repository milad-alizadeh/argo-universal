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

export const argoInstructions: readonly ArgoInstruction[] = [plan];
