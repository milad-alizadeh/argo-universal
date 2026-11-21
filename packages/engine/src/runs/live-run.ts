import { stripVTControlCharacters } from 'node:util';
import type { RunConfiguration } from './run-configurations';
import type { RunRecord } from './run-store';
import type { TerminalProcess } from './terminal';
import { TerminalRecording } from './terminal-recording';

const memoryCharacters = 65_536;

type LiveRunInput = {
  record: RunRecord;
  terminal: TerminalProcess;
  outputPath: string;
  configuration: RunConfiguration;
  fingerprint: string;
  // The first port of the Checkout's block, and the Session that started the Run, by name.
  block: number;
  starter: string;
};

type SaveRun = (record: RunRecord) => Promise<void>;

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
  public readonly outputPath: string;
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
    this.currentRecord = { ...input.record, pid: input.terminal.pid ?? null };
    this.terminal = input.terminal;
    this.outputPath = input.outputPath;
    this.configuration = input.configuration;
    this.fingerprint = input.fingerprint;
    this.block = input.block;
    this.starter = input.starter;
    this.recording = new TerminalRecording(this.outputPath);
    void this.ended.promise.then(() => this.recording.dispose());
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
      await this.terminal.stop();
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
    await this.flushed();
    await this.save(
      {
        status: this.isStopping() ? 'stopped' : 'crashed',
        exitCode,
        endedAt: now(),
      },
      save,
    );
  }

  private save(change: Partial<RunRecord>, save: SaveRun): Promise<void> {
    this.currentRecord = { ...this.currentRecord, ...change };

    return save(this.currentRecord);
  }

  public append(data: string): void {
    this.recording.append(data);
    this.output = (this.output + data).slice(-memoryCharacters);
  }
  public flushed(): Promise<void> {
    return this.recording.flushed();
  }
  // Whether the output so far matches the pattern the Run Configuration is ready by.
  public matches(pattern: RegExp): boolean {
    return pattern.test(stripVTControlCharacters(this.output));
  }
}
