import { expect, it } from 'vitest';
import { SessionNewInput } from './new';

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
  { configOptions: [{ id: 'model', value: 'small' }] },
  {
    prompt: [{ type: 'resource_link', name: 'File', uri: 'file:///repo/file' }],
  },
])(
  'rejects incomplete or obsolete New Session inputs: %j',
  (invalidFields): void => {
    expect(
      SessionNewInput.safeParse({ ...validNewSessionInput, ...invalidFields })
        .success,
    ).toBe(false);
  },
);

it('accepts an empty Session creation before its first prompt', (): void => {
  expect(
    SessionNewInput.parse({ ...validNewSessionInput, prompt: [] }).prompt,
  ).toEqual([]);
});
