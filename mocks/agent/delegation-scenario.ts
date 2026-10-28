import type { ScriptedStep } from './scripted-types.ts';

export const delegatedTitle = 'Review delegated work';

// The fixture uses the supplied CLI and Session token, discovering its Project through the public Operation.
const delegate = `
const { execFileSync } = require('node:child_process');
const run = (id, params) => JSON.parse(execFileSync('argo', ['run', id, '--params', JSON.stringify(params)], {encoding:'utf8'}));
const project = run('project.list', {}).find(project => project.inScope);
if (!project) throw new Error('No calling Project');
console.log(JSON.stringify(run('session.new', {
  projectId: project.id,
  agent: 'codex-acp',
  checkout: {type:'main'},
  configOptions: [],
  prompt: [{type:'text',text:${JSON.stringify(delegatedTitle)}}]
})));
`;

export const delegationSteps: ScriptedStep[] = [
  {
    type: 'terminal',
    toolCallId: 'start-session',
    request: { command: process.execPath, args: ['-e', delegate] },
    completion: 'wait-for-exit',
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'The delegated Session has started.' },
    },
  },
];
