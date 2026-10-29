import type { BlobRef } from '@repo/contracts';
import type {
  OperationExecution,
  OperationRunResponse,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { z } from 'zod';
import { readBlobBytes } from '../blob';
import { outputBlobStored } from '../feed';
import type { OperationResult, OperationRunResult } from './implementations';
import type { OperationsDeps } from './operations';

// An Operation's whole stored result, read once its Blob's Writer receipt arrives (ADR-0002).
export type OutputBlobs = (
  blob: BlobRef,
  signal?: AbortSignal,
) => Promise<Json>;

type BlobSources = Pick<
  OperationsDeps,
  'database' | 'blobsFolder' | 'findWriter'
>;

export const storedOutputBlobs =
  (deps: BlobSources): OutputBlobs =>
  async (blob, signal) => {
    await outputBlobStored(deps.findWriter(), blob.blobId, signal);
    const bytes = await readBlobBytes(deps, blob);

    return z.json().parse(JSON.parse(bytes.toString('utf8')));
  };

// The result as the wire carries it: a parsed result may hold `undefined` fields, which JSON leaves out.
const wireJson = (value: OperationResult): Json =>
  z.json().parse(JSON.parse(JSON.stringify(value)));

// What a caller is answered: the Operation's own result tagged as one, or its execution with any whole result inlined.
export class OperationResponses {
  public constructor(private readonly blobs: OutputBlobs) {}
  public run(
    value: OperationRunResult,
    signal?: AbortSignal,
  ): Promise<OperationRunResponse> {
    if (value.kind === 'operation_execution')
      return this.execution(value, signal);

    return Promise.resolve({ kind: 'result', result: wireJson(value.result) });
  }
  // The Blob reference stays beside the inlined result, so a caller can still fetch it.
  public async execution(
    execution: OperationExecution,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    if (!execution.fullResult) return execution;
    const result = await this.blobs(execution.fullResult, signal);

    return { ...execution, result };
  }
}
