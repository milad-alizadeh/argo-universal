import {
  completedRead,
  recordedToolCall,
  runningRead,
} from '../tool-call.mocks';
import type { ToolCallRowProps } from './tool-call-row';

export const runningToolCall = {
  row: runningRead,
} satisfies ToolCallRowProps;

export const completedToolCall = {
  row: completedRead,
} satisfies ToolCallRowProps;

export const commandWithoutOutput = {
  row: recordedToolCall('execute-pending'),
} satisfies ToolCallRowProps;
