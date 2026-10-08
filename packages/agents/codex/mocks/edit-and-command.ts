import type { VendorMessage } from '../messages';
import { readCommand, combinedCommand } from './commands';
import {
  turnStarted,
  turnCompleted,
  itemStarted,
  itemCompleted,
  usage,
} from './responses';
const threadId = '01a10a2c-978e-7893-b73b-c3ecfa41651b';
const turnId = '01a10a2c-97f7-7571-95f0-ed69fe96655a';
const context = { threadId, turnId };
export const responses = [
  turnStarted(
    {
      threadId,
      turn: {
        id: turnId,
        items: [],
        itemsView: 'notLoaded',
        status: 'inProgress',
        error: null,
        startedAt: 1791172057,
        completedAt: null,
        durationMs: null,
      },
    },
    1791172057090,
  ),
  itemStarted(
    { ...context, item: readCommand, startedAtMs: 1791172062416 },
    1791172062417,
  ),
  itemCompleted(
    {
      ...context,
      item: {
        ...readCommand,
        status: 'completed',
        aggregatedOutput: 'alpha\nbeta\n',
        exitCode: 0,
        durationMs: 0,
      },
      completedAtMs: 1791172062416,
    },
    1791172062418,
  ),
  itemStarted(
    { ...context, item: combinedCommand, startedAtMs: 1791172072705 },
    1791172072705,
  ),
  itemCompleted(
    {
      ...context,
      item: {
        ...combinedCommand,
        status: 'completed',
        aggregatedOutput: 'alpha\ngamma\nhello\n',
        exitCode: 0,
        durationMs: 0,
      },
      completedAtMs: 1791172072705,
    },
    1791172072707,
  ),
  itemCompleted(
    {
      ...context,
      item: {
        type: 'agentMessage',
        id: 'msg_0bf8e37c87213e10016ac31dea8ee087d28e520b9c3b995409',
        text: 'done',
        phase: 'final_answer',
        memoryCitation: null,
        delivery: null,
        questions: null,
      },
      completedAtMs: 1791172074720,
    },
    1791172074722,
  ),
  usage(
    {
      ...context,
      tokenUsage: {
        total: {
          totalTokens: 67978,
          inputTokens: 67765,
          cachedInputTokens: 50176,
          cacheWriteInputTokens: 0,
          outputTokens: 213,
          reasoningOutputTokens: 0,
        },
        last: {
          totalTokens: 17120,
          inputTokens: 17115,
          cachedInputTokens: 16896,
          cacheWriteInputTokens: 0,
          outputTokens: 5,
          reasoningOutputTokens: 0,
        },
        modelContextWindow: 258400,
      },
    },
    1791172074726,
  ),
  turnCompleted(
    {
      threadId,
      turn: {
        id: turnId,
        items: [],
        itemsView: 'summary',
        status: 'completed',
        error: null,
        startedAt: 1791172057,
        completedAt: 1791172074,
        durationMs: 17679,
      },
    },
    1791172074765,
  ),
] satisfies VendorMessage[];
