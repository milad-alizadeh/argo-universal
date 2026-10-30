import { expect, it } from 'vitest';
import { sessionOpenError } from './open-error';
import { AgentProcessExitError } from './process';

it('reports a missing command without the spawn error or its paths', () => {
  const stderr = `error: Executable not found in $PATH: "amp"
 syscall: "spawn amp",
 spawnargs: ["--mcp-config", "/Users/someone/.argo/mcp.json"]`;

  expect(sessionOpenError(new AgentProcessExitError(1, null, stderr))).toEqual({
    type: 'failed',
    message:
      "Couldn't start `amp`\n`amp` is not installed. Install it, then send the prompt again.",
  });
});

it('keeps the stderr of an exit that is not a missing command', () => {
  expect(sessionOpenError(new AgentProcessExitError(2, null, 'boom'))).toEqual({
    type: 'failed',
    message: 'Agent exited with status 2\nboom',
  });
});
