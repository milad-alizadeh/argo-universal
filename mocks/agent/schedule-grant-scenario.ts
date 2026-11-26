import type { ScriptedStep } from './scripted-types.ts';

export const scheduledReply = 'Both follow-ups are scheduled.';

// Schedules a follow-up in a Session of another Project through the supplied CLI and Session token, so it asks first.
const scheduleElsewhere = `
const { spawnSync } = require('node:child_process');
const execute = args => {
  const result = spawnSync('argo', args, {encoding:'utf8'});
  if (result.status !== 0 && result.status !== 75) throw new Error('argo exited ' + result.status + ': ' + result.stderr);
  return {result, value: JSON.parse(result.stdout)};
};
const run = (id, params) => {
  let response = execute(['run', id, '--params', JSON.stringify(params)]);
  while (response.result.status === 75) response = execute(['wait', response.value.id]);
  if (response.value.kind !== 'operation_execution') return response.value;
  if (response.value.status !== 'settled') throw new Error('Operation did not settle');
  return response.value.result;
};
const other = run('project.list', {}).find(project => !project.inScope);
if (!other) throw new Error('No other Project');
const [target] = run('session.list', {projectId: other.id}).sessions;
if (!target) throw new Error('No Session in the other Project');
console.log(JSON.stringify(run('session.schedulePrompt', {
  sessionId: target.sessionId,
  onceAt: 4102444800000,
  prompt: [{type:'text',text:'Check the build'}]
})));
`;

const schedule = (toolCallId: string): ScriptedStep => ({
  type: 'terminal',
  toolCallId,
  request: { command: process.execPath, args: ['-e', scheduleElsewhere] },
  completion: 'wait-for-exit',
  requiredExitCode: 0,
});

// Two Schedules into another Project: the first asks, and after Always allow the second runs without asking.
export const scheduleGrantSteps: ScriptedStep[] = [
  schedule('schedule-first'),
  schedule('schedule-second'),
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: scheduledReply },
    },
  },
];
