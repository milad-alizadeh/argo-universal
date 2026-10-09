import { SessionNewInput } from '@repo/contracts';
import { expect, it } from 'vitest';

const validNewSessionInput = {
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
  (invalidFields): void => {
    expect(
      SessionNewInput.safeParse({ ...validNewSessionInput, ...invalidFields })
        .success,
    ).toBe(false);
  },
);
