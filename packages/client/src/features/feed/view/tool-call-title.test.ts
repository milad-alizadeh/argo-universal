import { recordedFeedMocks } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { toolCallTitle } from './tool-call-title';

const command = recordedFeedMocks
  .flatMap((mock) => mock.rows)
  .find(
    (row) => row.sessionUpdate === 'tool_call_update' && row.kind === 'execute',
  );

if (command?.sessionUpdate !== 'tool_call_update')
  throw new Error('Recording needs a described command');

describe('toolCallTitle for a command', () => {
  it('is the description the Agent wrote, not the adapter title', () => {
    expect(toolCallTitle({ ...command, title: 'Terminal' })).toBe(
      command._meta?.argo?.description,
    );
  });

  it('is Running command while an undescribed Terminal runs', () => {
    const row = { ...command, title: 'Terminal', _meta: undefined };

    expect(toolCallTitle({ ...row, status: 'in_progress' })).toBe(
      'Running command',
    );
  });
});
