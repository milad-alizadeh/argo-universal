import {
  failedShell,
  lostShell,
  noCodeShell,
  runningShell,
  shellNow,
  stoppedShell,
} from './shell-list.mocks';
import type { ShellOutputProps } from './shell-output';
import {
  failedOutput,
  longRunningOutput,
  lostOutput,
  noCodeOutput,
  runningOutput,
  stoppedOutput,
} from './shell-output.mocks';

export const runningShellOutput = {
  shell: runningShell,
  output: runningOutput,
  now: shellNow,
} satisfies ShellOutputProps;

// Long enough to scroll up from the end, where Jump to latest shows.
export const longRunningShellOutput = {
  ...runningShellOutput,
  output: longRunningOutput,
} satisfies ShellOutputProps;

export const exitedShellOutput = {
  shell: failedShell,
  output: failedOutput,
  now: shellNow,
} satisfies ShellOutputProps;

export const stoppedShellOutput = {
  shell: stoppedShell,
  output: stoppedOutput,
  now: shellNow,
} satisfies ShellOutputProps;

export const exitedWithoutACodeShellOutput = {
  shell: noCodeShell,
  output: noCodeOutput,
  now: shellNow,
} satisfies ShellOutputProps;

export const lostShellOutput = {
  shell: lostShell,
  output: lostOutput,
  now: shellNow,
} satisfies ShellOutputProps;
