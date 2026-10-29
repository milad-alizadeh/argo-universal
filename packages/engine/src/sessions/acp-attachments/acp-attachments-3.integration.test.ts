import type { PromptRequest } from '@agentclientprotocol/sdk';
import { blobPath } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  markdown,
  pdf,
  uploadFile,
  uploadedLink,
  fileUri,
  promptWithUpload,
  notes,
} from './acp-attachments.test.mocks';

it.each([
  {
    kind: 'longer than 100 KiB',
    file: new File(['a'.repeat(102_401)], 'long.md', { type: markdown }),
  },
  {
    kind: 'not UTF-8',
    file: new File([new Uint8Array([99, 97, 102, 233])], 'latin.txt', {
      type: 'text/plain',
    }),
  },
])('an uploaded text file $kind is linked, not inlined', async ({ file }) => {
  const { request, blob, host } = await promptWithUpload(true, file);
  expect(request.prompt).toEqual([
    {
      type: 'resource_link',
      name: file.name,
      uri: fileUri(host, blob, file.name),
      mimeType: file.type,
      size: file.size,
    },
  ]);
});

it.each([
  { field: 'uri', change: { uri: blobPath('b'.repeat(64)) } },
  { field: 'mimeType', change: { mimeType: pdf } },
  { field: 'size', change: { size: 1 } },
])(
  'an uploaded file whose $field does not match its Blob is refused before the Agent sees it',
  async ({ change }) => {
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine({
      steps: [],
      responses: { 'session/prompt': [{ requests }] },
    });

    const blob = await uploadFile(
      host,
      new File([notes], 'notes.md', { type: markdown }),
    );

    const created = await host.caller.session.new(emptySessionInput);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ ...uploadedLink(blob, 'notes.md'), ...change }],
      }),
    ).rejects.toThrow('does not match its Blob');
    expect(requests).toEqual([]);
  },
);
