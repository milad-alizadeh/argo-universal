import type { ScriptedStep } from './scripted-types.ts';

// The real terminal writes in the Session's Checkout; the settled edit contains no patch for the App to reuse.
export const changedFilesSteps: ScriptedStep[] = [
  { type: 'wait-for-release' },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'greeting-edit',
      title: 'Edit greeting.txt',
      kind: 'edit',
      status: 'in_progress',
    },
  },
  {
    type: 'terminal',
    toolCallId: 'write-greeting',
    request: {
      command: '/bin/sh',
      args: ['-c', "printf 'Hello Argo\\n' > greeting.txt"],
    },
    completion: 'wait-for-exit',
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'greeting-edit',
      status: 'completed',
    },
  },
  { type: 'wait-for-cancel' },
];
