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

it('accepts a link with no uploaded file, as a chosen suggestion carries', (): void => {
  const link = {
    type: 'resource_link',
    name: 'Item 7',
    uri: 'example://items/7',
  };

  expect(
    SessionNewInput.parse({
      ...validNewSessionInput,
      prompt: [{ type: 'text', text: 'ITEM-7 ' }, link],
    }).prompt,
  ).toEqual([{ type: 'text', text: 'ITEM-7 ' }, link]);
});

it('accepts a file uploaded from the device', (): void => {
  const file = {
    type: 'resource_link',
    name: 'notes.md',
    uri: '/blobs/blob-1',
    blob: { blobId: 'blob-1', mime: 'text/markdown', bytes: 7 },
  };

  expect(
    SessionNewInput.parse({ ...validNewSessionInput, prompt: [file] }).prompt,
  ).toEqual([file]);
});
