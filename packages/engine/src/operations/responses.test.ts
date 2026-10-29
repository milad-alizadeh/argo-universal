import type { OperationExecution } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { OperationResponses, type OutputBlobs } from './responses';

const fullResult = {
  blobId: 'b'.repeat(64),
  mime: 'application/json',
  bytes: 9,
};

const execution: OperationExecution = {
  kind: 'operation_execution',
  id: `call:session-1:${'a'.repeat(64)}`,
  status: 'settled',
  result: 'preview',
};

const noBlobs: OutputBlobs = () => Promise.reject(new Error('No Blob to read'));

it('tags an Operation result as one', async () => {
  const responses = new OperationResponses(noBlobs);

  expect(await responses.run({ enabled: true })).toEqual({
    kind: 'result',
    result: { enabled: true },
  });
});

it('answers an execution without a stored result as it is', async () => {
  const responses = new OperationResponses(noBlobs);

  expect(await responses.run(execution)).toEqual(execution);
});

it('inlines the whole stored result beside its Blob reference once the Blob is read', async () => {
  const stored = Promise.withResolvers<Json>();
  const read: string[] = [];

  const responses = new OperationResponses(async (blob) => {
    read.push(blob.blobId);

    return stored.promise;
  });

  const answer = responses.execution({ ...execution, fullResult });
  stored.resolve({ agents: ['whole'] });

  expect(await answer).toEqual({
    ...execution,
    fullResult,
    result: { agents: ['whole'] },
  });
  expect(read).toEqual([fullResult.blobId]);
});
