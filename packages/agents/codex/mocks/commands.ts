import type { ThreadItem } from '../protocol.gen';
export const readCommand = {
  type: 'commandExecution',
  id: 'exec-2fe50f79-a80c-4d3a-96a9-97ff33a9ad2b',
  pluginId: null,
  scriptPath: null,
  command: "/bin/zsh -lc 'cat app.txt'",
  cwd: '/repo',
  processId: '82298',
  source: 'unifiedExecStartup',
  status: 'inProgress',
  commandActions: [
    {
      type: 'read',
      command: 'cat app.txt',
      name: 'app.txt',
      path: '/repo/app.txt',
    },
  ],
  aggregatedOutput: null,
  exitCode: null,
  durationMs: null,
} satisfies Extract<ThreadItem, { type: 'commandExecution' }>;
export const combinedCommand = {
  type: 'commandExecution',
  id: 'exec-f27ca824-f7d7-4709-a913-310e66957673',
  pluginId: null,
  scriptPath: null,
  command: "/bin/zsh -lc 'cat app.txt notes.md'",
  cwd: '/repo',
  processId: '25387',
  source: 'unifiedExecStartup',
  status: 'inProgress',
  commandActions: [{ type: 'unknown', command: 'cat app.txt notes.md' }],
  aggregatedOutput: null,
  exitCode: null,
  durationMs: null,
} satisfies Extract<ThreadItem, { type: 'commandExecution' }>;
