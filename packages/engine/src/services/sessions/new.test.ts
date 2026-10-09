import { SessionNewInput } from '@repo/contracts';
import { expect, it } from 'vitest';

const initial = {
  projectId: 'project-1',
  agent: 'agent-one',
  checkout: { type: 'main' },
  configOptions: [],
  prompt: [{ type: 'text', text: 'Build it' }],
};

it.each([
  { checkout: { type: 'worktree' } },
  { checkout: 'main' },
  { prompt: [] },
  { configOptions: [{ id: 'model', value: 'small' }] },
  {
    prompt: [{ type: 'resource_link', name: 'File', uri: 'file:///repo/file' }],
  },
])(
  'rejects incomplete or obsolete New Session mock inputs: %j',
  (invalid): void => {
    expect(SessionNewInput.safeParse({ ...initial, ...invalid }).success).toBe(
      false,
    );
  },
);
