import identities from './identities.json' with { type: 'json' };
import type { ScriptedStep } from './scripted-types.ts';

const callerAgent = process.env.ARGO_E2E_AGENT_ID ?? identities[0]?.agent;

const delegatedAgent = identities.find(
  ({ agent }) => agent !== callerAgent,
)?.agent;

export const delegatedTitle = 'Review delegated work';

// The fixture uses the supplied CLI and Session token, discovering its Project through the public Operation.
const delegate = `
const { spawnSync } = require('node:child_process');
const execute = args => {
  const result = spawnSync('argo', args, {encoding:'utf8'});
  if (result.status !== 0 && result.status !== 75) throw new Error('argo exited ' + result.status + ': ' + result.stderr);
  const value = JSON.parse(result.stdout);
  if (result.status === 75 && (value.kind !== 'operation_execution' || typeof value.id !== 'string' || !['still_running', 'waiting_for_user'].includes(value.status))) throw new Error('Invalid pending Operation');
  return {result, value};
};
const run = (id, params) => {
  let response = execute(['run', id, '--params', JSON.stringify(params)]);
  while (response.result.status === 75) response = execute(['wait', response.value.id]);
  if (response.value.kind !== 'operation_execution') return response.value;
  if (response.value.status !== 'settled') throw new Error('Operation did not settle');
  return response.value.result;
};
const project = run('project.list', {}).find(project => project.inScope);
if (!project) throw new Error('No calling Project');
console.log(JSON.stringify(run('session.new', {
  projectId: project.id,
  agent: ${JSON.stringify(delegatedAgent)},
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
    requiredExitCode: 0,
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'The delegated Session has started.' },
    },
  },
];
