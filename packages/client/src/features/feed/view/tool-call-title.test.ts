import type { ToolCallUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { toolCallTitle } from './tool-call-title';

const recorded = recordedFeedMocks
  .flatMap((mock) => mock.rows)
  .find(
    (row) => row.sessionUpdate === 'tool_call_update' && row.kind === 'execute',
  );

if (recorded?.sessionUpdate !== 'tool_call_update')
  throw new Error('Recording needs a command');

const description = 'Run the tests';

const terminal = {
  type: 'terminal' as const,
  command: 'pnpm test',
  output: '',
};

const command = (change: Partial<ToolCallUpdate>): ToolCallUpdate => ({
  ...recorded,
  status: 'in_progress',
  content: [terminal],
  _meta: undefined,
  ...change,
});

describe('toolCallTitle for a command', () => {
  it.each([
    { title: 'Terminal', expected: description },
    { title: 'pnpm test', expected: description },
  ])('is the description over the title "$title"', ({ title, expected }) => {
    const row = command({ title, _meta: { argo: { description: expected } } });

    expect(toolCallTitle(row)).toBe(expected);
  });

  it.each(['Terminal', 'pnpm test', ''])(
    'is Running command while the title "%s" is no description',
    (title) => {
      expect(toolCallTitle(command({ title }))).toBe('Running command');
    },
  );

  it('is Ran command once such a command settles', () => {
    const row = command({ title: 'Terminal', status: 'completed' });

    expect(toolCallTitle(row)).toBe('Ran command');
  });

  it('is a title that says more than the command', () => {
    expect(toolCallTitle(command({ title: description }))).toBe(description);
  });

  it('is the description while awaiting approval', () => {
    const row = command({
      title: 'Terminal',
      _meta: { argo: { description: description } },
    });

    expect(toolCallTitle(row, true)).toBe(description);
  });
});
