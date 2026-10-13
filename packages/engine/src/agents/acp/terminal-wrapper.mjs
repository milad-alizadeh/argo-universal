import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { constants } from 'node:os';
import { createInterface } from 'node:readline';
import { TerminalLaunchMessage } from './terminal-control-message.ts';

const address = process.argv[2];

const token = process.argv[3];

const stop = () => process.kill(-process.pid, 'SIGKILL');

const socket = connect(address);

for (const signal of ['SIGTERM', 'SIGHUP', 'SIGINT', 'SIGQUIT'])
  process.on(signal, () => {});

socket.on('error', stop);

socket.on('close', stop);

socket.once('connect', () =>
  socket.write(`${JSON.stringify({ type: 'ready', token })}\n`),
);

const completed = (exitCode, signal) =>
  socket.write(
    `${JSON.stringify({ type: 'exit', exitCode: exitCode ?? 1, signal: signal ? constants.signals[signal] : undefined })}\n`,
  );

const launch = (frame) => {
  try {
    const input = TerminalLaunchMessage.parse(JSON.parse(frame));

    const child = spawn(input.executable, input.args, {
      cwd: input.cwd,
      env: input.env,
      stdio: 'inherit',
    });

    child.once('error', () => completed(1));
    child.once('exit', completed);
  } catch {
    completed(1);
  }
};

createInterface({ input: socket }).once('line', launch);
