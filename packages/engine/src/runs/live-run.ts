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
  // The first port of the Checkout's block, and the Session that started the Run, by name.
  block: number;
  starter: string;
};

// What a Run is in memory while its terminal lives; the stored record follows it.
export class LiveRun {
  public stopping?: Promise<void>;
  public record: RunRecord;
  public readonly terminal: TerminalProcess;
  public readonly outputPath: string;
  public readonly configuration: RunConfiguration;
  public readonly block: number;
  public readonly starter: string;
  public readonly ended = Promise.withResolvers<void>();
  public readonly ready = Promise.withResolvers<void>();
  private readonly recording: TerminalRecording;
  public get screen(): TerminalRecording['screen'] {
    return this.recording.screen;
  }
  private output = '';
  public constructor(input: LiveRunInput) {
    this.record = input.record;
    this.terminal = input.terminal;
    this.outputPath = input.outputPath;
    this.configuration = input.configuration;
    this.block = input.block;
    this.starter = input.starter;
    this.recording = new TerminalRecording(this.outputPath);
    void this.ended.promise.then(() => this.recording.dispose());
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
