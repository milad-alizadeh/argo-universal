import type { VendorMessage } from '../messages';
import { itemCompleted, turnCompleted, turnStarted } from './responses';
const threadId = '01a0ed18-6de3-7310-9fff-bca3bc04fae2';
const turnId = '01a0ed18-6f35-7d52-819e-0cfdfd7717ec';
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
        startedAt: 1790684196,
        completedAt: null,
        durationMs: null,
      },
    },
    1790684196700,
  ),
  itemCompleted(
    {
      item: {
        type: 'fileChange',
        id: 'exec-817e1a4c-4dd4-47c8-8992-0fedf6c0bfbb',
        changes: [
          {
            path: '/repo/app.txt',
            kind: { type: 'update', move_path: null },
            diff: '@@ -1,2 +1,2 @@\n alpha\n-beta\n+gamma\n',
          },
          { path: '/repo/notes.md', kind: { type: 'add' }, diff: 'hello\n' },
        ],
        status: 'completed',
      },
      threadId,
      turnId,
      completedAtMs: 1790684200827,
    },
    1790684200828,
  ),
  itemCompleted(
    {
      item: {
        type: 'agentMessage',
        id: 'msg_0628ec1a4503e8f5016abbac2a4d3087d2ae634107badf63bf',
        text: 'done',
        phase: 'final_answer',
        memoryCitation: null,
        delivery: null,
        questions: null,
      },
      threadId,
      turnId,
      completedAtMs: 1790684202335,
    },
    1790684202339,
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
        startedAt: 1790684196,
        completedAt: 1790684202,
        durationMs: 5828,
      },
    },
    1790684202498,
  ),
] satisfies VendorMessage[];
