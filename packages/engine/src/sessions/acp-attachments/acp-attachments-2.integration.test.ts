import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import {
  markdown,
  pdf,
  fileUri,
  promptWithUpload,
  notes,
} from './acp-attachments.test.mocks';

it('an uploaded text file reaches the Agent inline, named by a copy that keeps its file name', async () => {
  const { request, blob, host } = await promptWithUpload(
    true,
    new File([notes], 'notes.md', { type: markdown }),
  );

  expect(request.prompt).toEqual([
    {
      type: 'resource',
      resource: {
        uri: fileUri(host, blob, 'notes.md'),
        mimeType: markdown,
        text: notes,
      },
    },
  ]);
});

it('an uploaded text file is linked when the Agent takes no embedded context', async () => {
  const { request, blob, host } = await promptWithUpload(
    false,
    new File([notes], 'notes.md', { type: markdown }),
  );

  expect(request.prompt).toEqual([
    {
      type: 'resource_link',
      name: 'notes.md',
      uri: fileUri(host, blob, 'notes.md'),
      mimeType: markdown,
      size: notes.length,
    },
  ]);
});

it('an uploaded binary file is linked to a copy holding its exact bytes', async () => {
  const bytes = new Uint8Array([37, 80, 68, 70, 0, 255, 1]);

  const { request, blob, host } = await promptWithUpload(
    true,
    new File([bytes], 'spec.pdf', { type: pdf }),
  );

  expect({
    prompt: request.prompt,
    copy: new Uint8Array(
      await readFile(fileURLToPath(fileUri(host, blob, 'spec.pdf'))),
    ),
  }).toEqual({
    prompt: [
      {
        type: 'resource_link',
        name: 'spec.pdf',
        uri: fileUri(host, blob, 'spec.pdf'),
        mimeType: pdf,
        size: bytes.length,
      },
    ],
    copy: bytes,
  });
});

it('an uploaded file keeps its Blob for the Session that sent it', async () => {
  const { blob, host } = await promptWithUpload(
    true,
    new File([notes], 'notes.md', { type: markdown }),
  );

  expect(
    host.database.$client.prepare('SELECT blob_id FROM blob_ref').all(),
  ).toEqual([{ blob_id: blob.blobId }]);
});

it('an uploaded file name cannot leave its attachment folder', async () => {
  const { request, blob, host } = await promptWithUpload(
    false,
    new File([notes], '../../escape.md', { type: markdown }),
  );

  expect(request.prompt).toMatchObject([
    { uri: fileUri(host, blob, 'escape.md') },
  ]);
});
