import {
  commandNow,
  failedCommand,
  longOutputCommand,
  runningCommand,
  stoppedCommand,
} from '../tool-call.mocks';
import type { CommandRowProps } from './command-row';

export const runningCommandRow = {
  row: runningCommand,
  now: commandNow,
} satisfies CommandRowProps;

export const completedCommandRow = {
  row: longOutputCommand,
  initialOpen: true,
} satisfies CommandRowProps;

export const failedCommandRow = {
  row: failedCommand,
  initialOpen: true,
} satisfies CommandRowProps;

export const stoppedCommandRow = {
  row: stoppedCommand,
  initialOpen: true,
} satisfies CommandRowProps;
