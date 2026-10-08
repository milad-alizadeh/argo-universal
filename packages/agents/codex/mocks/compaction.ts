import type { VendorMessage } from '../messages';
import { itemCompleted, itemStarted, turnStarted } from './responses';
const threadId = '01a10f63-2763-7ea2-a488-52bfdd78bb3b';
const turnId = '01a10f63-35a7-7e33-8acc-31b1fc81ec26';
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
        startedAt: 1791259522,
        completedAt: null,
        durationMs: null,
      },
    },
    1791259522523,
  ),
  itemStarted(
    {
      item: {
        type: 'contextCompaction',
        id: '01a10f63-35db-7062-a47d-ebd815c1bea2',
      },
      threadId,
      turnId,
      startedAtMs: 1791259522523,
    },
    1791259522524,
  ),
  itemCompleted(
    {
      item: {
        type: 'contextCompaction',
        id: '01a10f63-35db-7062-a47d-ebd815c1bea2',
      },
      threadId,
      turnId,
      completedAtMs: 1791259528800,
    },
    1791259528801,
  ),
] satisfies VendorMessage[];
