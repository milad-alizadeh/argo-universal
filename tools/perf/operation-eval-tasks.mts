import { withVoiceInstruction } from '@repo/engine/voice-prompt';

/*
 * What the eval asks an Agent, in a person's words, and the Argo Operation that answers it. None names an
 * Operation id, except where Argo's own instructions already give it, so the Agent has to find the rest.
 */
export type EvalTask = {
  id: string;
  prompt: string;
  expected: string;
};

export const evalTasks: readonly EvalTask[] = [
  {
    id: 'todo-list',
    prompt:
      'Make a todo list with two steps, "look around" and "report back", then do both briefly.',
    expected: 'session.setTodos',
  },
  {
    id: 'start-session',
    prompt:
      'Start a new Argo Session in this Project, with the same Agent as you and no first prompt. Tell me its id.',
    expected: 'session.new',
  },
  {
    id: 'rename',
    prompt: 'Rename this Argo Session to "Eval rename".',
    expected: 'session.rename',
  },
  {
    id: 'list-projects',
    prompt: 'Which Projects are registered in Argo? List their names.',
    expected: 'project.list',
  },
  {
    id: 'validate-diagram',
    prompt:
      'Is this Mermaid diagram valid? Check it with Argo.\n\nflowchart LR\n  A --> B',
    expected: 'diagram.validate',
  },
  {
    // What a Voice call sends the Agent: its instruction, then what the person said.
    id: 'voice-start-session',
    prompt: withVoiceInstruction('Start a new session for me in this project.'),
    expected: 'session.new',
  },
];
