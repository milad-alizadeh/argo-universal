// Keep the group leader until the Engine has observed command exit and cleanup.
export const shellWrapper = `
const { spawn } = require('node:child_process');
const stop = () => process.kill(-process.pid, 'SIGKILL');
const send = message => {
  if (!process.connected) return stop();
  process.send(message, error => { if (error) stop(); });
};
process.on('SIGTERM', () => {});
process.once('disconnect', stop);
process.once('message', input => {
  if (!process.connected) return stop();
  const child = spawn(input.command, input.args, {
    cwd: input.cwd, env: input.env, stdio: ['ignore', 'inherit', 'inherit'],
  });
  child.once('spawn', () => send({ type: 'started' }));
  child.once('error', error => send({ type: 'failed', message: error.message }));
  child.once('exit', (exitCode, signal) => send({ type: 'exited', exitCode, signal }));
});
if (!process.connected) stop();
`;
