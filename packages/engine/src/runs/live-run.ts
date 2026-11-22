import { stripVTControlCharacters } from 'node:util';
import type { OutputBlobMetadata } from '../blob';
import type { RunConfiguration } from './run-configurations';
import { retainRunOutput, runOutputFor } from './run-output';
import type { RunRecord } from './run-store';
import type { TerminalProcess } from './terminal';
import type { TerminalRecording } from './terminal-recording';

const memoryCharacters = 65_536;

type LiveRunInput = {
  record: RunRecord;
  recording: TerminalRecording;
  home: string;
  configuration: RunConfiguration;
  fingerprint: string;
  // The first port of the Checkout's block, and the Session that started the Run, by name.
  block: number;
  starter: string;
};

type SaveRun = (
  record: RunRecord,
  output?: OutputBlobMetadata,
) => Promise<void>;

type RunFinish = {
  save: SaveRun;
  failed: (error: Error) => void;
  released: () => void;
};

// What a Run is in memory while its terminal lives; the stored record follows it.
export class LiveRun {
  private shutdown?: Promise<void>;
  private finishing?: Promise<void>;
  private currentRecord: RunRecord;
  public readonly terminal: TerminalProcess;
  private readonly home: string;
  public readonly configuration: RunConfiguration;
  public readonly fingerprint: string;
  public readonly block: number;
  public readonly starter: string;
  private readonly ended = Promise.withResolvers<void>();
  private readonly ready = Promise.withResolvers<void>();
  private readonly recording: TerminalRecording;
  public get screen(): TerminalRecording['screen'] {
    return this.recording.screen;
  }
  private output = '';
  public constructor(input: LiveRunInput) {
    this.terminal = input.recording.process;
    this.currentRecord = { ...input.record, pid: this.terminal.pid ?? null };
    this.home = input.home;
    this.configuration = input.configuration;
    this.fingerprint = input.fingerprint;
    this.block = input.block;
    this.starter = input.starter;
    this.recording = input.recording;
    void this.ended.promise.then(() => this.recording.dispose());
  }
  public get outputPath(): string {
    return runOutputFor(this.home, this.currentRecord);
  }

  public get record(): Readonly<RunRecord> {
    return this.currentRecord;
  }

  public isStopping(): boolean {
    return this.shutdown !== undefined;
  }

  public whenReleased(): Promise<void> | undefined {
    return this.shutdown ?? this.finishing;
  }

  public stop(released: () => void): Promise<void> {
    this.shutdown ??= Promise.resolve().then(async () => {
      await this.recording.stop();
      await this.whenEnded();
      released();
    });

    return this.shutdown;
  }

  public whenReady(): Promise<void> {
    return this.ready.promise;
  }

  public whenEnded(): Promise<void> {
    return this.ended.promise;
  }

  public async markReady(readyAt: number, save: SaveRun): Promise<void> {
    await this.save({ status: 'ready', readyAt }, save);
    this.ready.resolve();
  }

  public finish(
    exitCode: number,
    now: () => number,
    { save, failed, released }: RunFinish,
  ): Promise<void> {
    this.finishing ??= this.complete(exitCode, now, save)
      .catch(failed)
      .finally(() => {
        this.ended.resolve();

        if (!this.isStopping()) released();
      });

    return this.finishing;
  }

  private async complete(
    exitCode: number,
    now: () => number,
    save: SaveRun,
  ): Promise<void> {
    await this.recording.seal();
    const endedAt = now();
    const output = await retainRunOutput(this.home, this.currentRecord.id);

    await this.save(
      {
        status: this.isStopping() ? 'stopped' : 'crashed',
        exitCode,
        endedAt,
        outputBlobId: output?.id ?? null,
      },
      (record) => save(record, output),
    );
  }

  private save(change: Partial<RunRecord>, save: SaveRun): Promise<void> {
    this.currentRecord = { ...this.currentRecord, ...change };

    return save(this.currentRecord);
  }

  public watchOutput(changed: () => void): void {
    this.recording.watchOutput(changed, (data) => {
      this.output = (this.output + data).slice(-memoryCharacters);
    });
  }
  public flushed(): Promise<void> {
    return this.recording.flushed();
  }
  // Whether the output so far matches the pattern the Run Configuration is ready by.
  public matches(pattern: RegExp): boolean {
    return pattern.test(stripVTControlCharacters(this.output));
  }
}
