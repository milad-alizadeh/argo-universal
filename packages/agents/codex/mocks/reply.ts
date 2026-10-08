import type { VendorMessage } from '../messages';
import { itemCompleted, turnCompleted, turnStarted } from './responses';
const threadId = '01a0e7d5-8a93-7ea3-b03b-39de1ddbe469';
const turnId = '01a0e7d5-8b8b-7712-bbe5-b36bdf8686fd';
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
        startedAt: 1790595926,
        completedAt: null,
        durationMs: null,
      },
    },
    1790595926944,
  ),
  itemCompleted(
    {
      item: {
        type: 'agentMessage',
        id: 'msg_033b655099c41202016aba5359e75087d297fd565cbc71c153',
        text: 'OK',
        phase: 'final_answer',
        memoryCitation: null,
        delivery: null,
        questions: null,
      },
      threadId,
      turnId,
      completedAtMs: 1790595930038,
    },
    1790595930041,
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
        startedAt: 1790595926,
        completedAt: 1790595930,
        durationMs: 3200,
      },
    },
    1790595930133,
  ),
] satisfies VendorMessage[];
