import type {
  CreateTerminalRequest,
  TerminalExitStatus,
} from '@agentclientprotocol/sdk';
import type { ShellRecord } from '@repo/contracts';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../../storage';
import { appendShellOutput } from '../shells/files';
import { shellOutputBlob, type ShellOutputBlob } from '../shells/output-blob';
import { ShellWriteJob } from '../shells/storage';
import { shellFromTerminal } from './shells';

export type ShellCaptureInput = {
  id: string;
  sessionId: string;
  request: CreateTerminalRequest;
  cwd: string;
  path: string;
  writer: WriterActorRef;
  now: () => number;
  changed: (record: ShellRecord) => void;
  failed: (error: Error) => void;
};

type ShellEnding = Pick<ShellRecord, 'status' | 'exitCode' | 'endedAt'>;

export class ShellCapture {
  private record?: ShellRecord;
  private ending?: ShellEnding;
  private pending = Promise.resolve();
  private readonly startedAt: number;
  public constructor(private readonly input: ShellCaptureInput) {
    this.startedAt = input.now();
  }
  public append(text: string): Promise<void> {
    this.enqueue(() => appendShellOutput(this.input.path, text));

    return this.pending;
  }
  public associate(toolCallId: string): void {
    if (this.record) return;

    this.record = shellFromTerminal(
      this.input.request,
      { type: 'terminal', terminalId: this.input.id },
      {
        sessionId: this.input.sessionId,
        toolCallId,
        cwd: this.input.cwd,
        startedAt: this.startedAt,
      },
    );
    this.enqueue(() => this.save());
  }
  public end(
    status: ShellRecord['status'],
    exit: TerminalExitStatus,
  ): Promise<void> {
    const ending = {
      status,
      exitCode: exit.exitCode ?? null,
      endedAt: this.input.now(),
    };

    this.enqueue(async () => {
      this.ending ??= ending;
      await this.save();
    });

    return this.pending;
  }
  public drain(): Promise<void> {
    return this.pending;
  }
  private enqueue(work: () => Promise<void>): void {
    this.pending = this.pending.then(work);
    void this.pending.catch((cause) =>
      this.input.failed(
        cause instanceof Error ? cause : new Error(String(cause)),
      ),
    );
  }
  private async save(): Promise<void> {
    if (!this.record) return;

    this.record = { ...this.record, ...this.ending };
    const output = await this.endedOutput();
    await writeDatabaseJobAndWaitForCommit(
      this.input.writer,
      new ShellWriteJob(this.record, output),
      true,
    );
    this.input.changed(this.record);
  }
  private async endedOutput(): Promise<ShellOutputBlob | undefined> {
    if (!this.record || this.record.status === 'running') return;

    const output = await shellOutputBlob(this.input.path);
    this.record = { ...this.record, outputBlobId: output.metadata.id };

    return output;
  }
}
