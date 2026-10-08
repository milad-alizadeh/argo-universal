import type { VendorMessage } from '../messages';
import { itemStarted, turnCompleted, turnStarted, usage } from './responses';
const threadId = '01a10a2c-978e-7893-b73b-c3ecfa41651b';
const turnId = '01a10a2c-ddd9-76e0-a25a-6d56b5227635';
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
        startedAt: 1791172074,
        completedAt: null,
        durationMs: null,
      },
    },
    1791172074985,
  ),
  itemStarted(
    {
      item: {
        type: 'commandExecution',
        id: 'exec-74ec3292-520b-4563-82d4-09f95eed79de',
        pluginId: null,
        scriptPath: null,
        command: "/bin/zsh -lc 'sleep 30'",
        cwd: '/repo',
        processId: '15805',
        source: 'unifiedExecStartup',
        status: 'inProgress',
        commandActions: [{ type: 'unknown', command: 'sleep 30' }],
        aggregatedOutput: null,
        exitCode: null,
        durationMs: null,
      },
      threadId,
      turnId,
      startedAtMs: 1791172079446,
    },
    1791172079446,
  ),
  usage(
    {
      threadId,
      turnId,
      tokenUsage: {
        total: {
          totalTokens: 87883,
          inputTokens: 87613,
          cachedInputTokens: 67072,
          cacheWriteInputTokens: 0,
          outputTokens: 270,
          reasoningOutputTokens: 0,
        },
        last: {
          totalTokens: 19905,
          inputTokens: 19848,
          cachedInputTokens: 16896,
          cacheWriteInputTokens: 0,
          outputTokens: 57,
          reasoningOutputTokens: 0,
        },
        modelContextWindow: 258400,
      },
    },
    1791172079449,
  ),
  turnCompleted(
    {
      threadId,
      turn: {
        id: turnId,
        items: [],
        itemsView: 'notLoaded',
        status: 'interrupted',
        error: null,
        startedAt: 1791172074,
        completedAt: 1791172079,
        durationMs: 4470,
      },
    },
    1791172079454,
  ),
] satisfies VendorMessage[];
