import { completedRead, runningRead } from '../tool-call.mocks';
import type { ToolCallRowProps } from './tool-call-row';

export const runningToolCall = {
  row: runningRead,
} satisfies ToolCallRowProps;

export const completedToolCall = {
  row: completedRead,
} satisfies ToolCallRowProps;
