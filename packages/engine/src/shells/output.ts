import { setTimeout } from 'node:timers/promises';
import type {
  ShellOutput,
  ShellOutputInput,
  ShellRecord,
} from '@repo/contracts';
import { readOutput, type OutputStorage } from './output-reader';
import { decodeShellOutput, type DecodedOutput } from './output-text';

const outputReadInterval = 60;

export const watchShellOutput = (
  storage: OutputStorage,
  input: ShellOutputInput,
  signal?: AbortSignal,
): AsyncIterable<ShellOutput> => new ShellOutputStream(storage, input, signal);

class ShellOutputStream implements AsyncIterableIterator<ShellOutput> {
  private after: number;
  private initial = true;
  private done = false;
  private readonly controller = new AbortController();
  private readonly signal: AbortSignal;
  public constructor(
    private readonly storage: OutputStorage,
    private readonly input: ShellOutputInput,
    signal?: AbortSignal,
  ) {
    this.after = input.after ?? 0;
    this.signal = signal
      ? AbortSignal.any([signal, this.controller.signal])
      : this.controller.signal;
  }
  public [Symbol.asyncIterator](): AsyncIterableIterator<ShellOutput> {
    return this;
  }
  public async next(): Promise<IteratorResult<ShellOutput, void>> {
    if (this.done || this.signal.aborted)
      return { done: true, value: undefined };

    return { done: false, value: await this.waitForChunk() };
  }
  public async return(): Promise<IteratorResult<ShellOutput, void>> {
    this.controller.abort();

    return { done: true, value: undefined };
  }
  private async waitForChunk(): Promise<ShellOutput> {
    while (true) {
      const chunk = await this.readChunk();

      if (chunk) return chunk;
      await setTimeout(outputReadInterval, undefined, { signal: this.signal });
    }
  }
  private async readChunk(): Promise<ShellOutput | undefined> {
    const { record, bytes, total } = await readOutput(
      this.storage,
      this.input,
      this.after,
    );

    const chunk = decodeShellOutput(
      bytes,
      hasEnded(record, this.after + bytes.length, total),
    );

    if (!this.shouldPublish(record, chunk.text)) return;

    return this.publish(record, chunk, total);
  }
  private publish(
    record: ShellRecord,
    chunk: DecodedOutput,
    total: number,
  ): ShellOutput {
    this.after += chunk.consumed;
    this.initial = false;
    this.done = hasEnded(record, this.after, total);

    return { text: chunk.text, after: this.after, status: record.status };
  }
  private shouldPublish(record: ShellRecord, text: string): boolean {
    return this.initial || text.length > 0 || record.status !== 'running';
  }
}

const hasEnded = (record: ShellRecord, after: number, total: number): boolean =>
  record.status !== 'running' && after === total;
