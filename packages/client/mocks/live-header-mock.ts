import type { LiveHeaderProps } from '../src/components/LiveHeader';
import { runningCommand } from './tool-call-mock';

export const liveHeaderNow = Date.UTC(2026, 9, 6, 9, 0, 0);

const ago = (seconds: number) => liveHeaderNow - seconds * 1000;

const searchCall = { ...runningCommand, kind: 'search' as const, _meta: {} };
const namedCall = { ...runningCommand, kind: 'other' as const, _meta: {} };

// Each live header step from spec 0003, in the order the Server picks them.
export const liveHeaderSteps = [
  {
    step: 'Permission request',
    text: 'Awaiting approval',
    source: { type: 'request' },
    startedAt: ago(134),
    elapsed: '2m 14s',
  },
  {
    step: 'Elicitation',
    text: 'Waiting for your answer',
    source: { type: 'request' },
    startedAt: ago(134),
    elapsed: '2m 14s',
  },
  {
    step: 'Plan proposal',
    text: 'Plan ready',
    source: { type: 'request' },
    startedAt: ago(134),
    elapsed: '2m 14s',
  },
  {
    step: 'Retry',
    text: 'Retrying (2 of 5)',
    source: { type: 'retry' },
    startedAt: ago(41),
    elapsed: '41s',
  },
  {
    step: 'Thought title',
    text: 'Checking how rows merge after a reconnect',
    source: { type: 'thought' },
    startedAt: ago(18),
    elapsed: '18s',
  },
  {
    step: 'Tool call title',
    text: 'Show hello.txt and short git status',
    source: { type: 'tool_call', row: runningCommand },
    startedAt: ago(12),
    elapsed: '12s',
  },
  {
    step: 'Tool call kind',
    text: 'Running pnpm typecheck',
    source: { type: 'tool_call', row: runningCommand },
    startedAt: ago(8),
    elapsed: '8s',
  },
  {
    step: 'Tool call kind, search',
    text: 'Searching files',
    source: { type: 'tool_call', row: searchCall },
    startedAt: ago(63),
    elapsed: '1m 03s',
  },
  {
    step: 'Tool call name',
    text: 'mcp__github__search_issues',
    source: { type: 'tool_call', row: namedCall },
    startedAt: ago(27),
    elapsed: '27s',
  },
  {
    step: 'Working',
    text: 'Working',
    source: { type: 'working' },
    startedAt: ago(3),
    elapsed: '3s',
  },
] as const satisfies (Omit<LiveHeaderProps, 'now'> & {
  step: string;
  elapsed: string;
})[];
