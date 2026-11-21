import { stripVTControlCharacters } from 'node:util';
import type { RunConfiguration } from './run-configurations';
import { appendRunOutput } from './run-output';
import { RunScreen } from './run-screen';
import type { RunRecord } from './run-store';
import {
  terminalColumns,
  terminalRows,
  type TerminalProcess,
} from './terminal';

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
  public readonly screen = new RunScreen(terminalColumns, terminalRows);
  private output = '';
  private pendingWrites: Promise<void> = Promise.resolve();
  public constructor(input: LiveRunInput) {
    this.record = input.record;
    this.terminal = input.terminal;
    this.outputPath = input.outputPath;
    this.configuration = input.configuration;
    this.block = input.block;
    this.starter = input.starter;
    void this.ended.promise.then(() => this.screen.dispose());
  }
  public append(data: string): void {
    this.screen.write(data);
    this.output = (this.output + data).slice(-memoryCharacters);
    this.pendingWrites = this.pendingWrites.then(() =>
      appendRunOutput(this.outputPath, data).catch((): void => undefined),
    );
  }
  public flushed(): Promise<void> {
    return this.pendingWrites;
  }
  // Whether the output so far matches the pattern the Run Configuration is ready by.
  public matches(pattern: RegExp): boolean {
    return pattern.test(stripVTControlCharacters(this.output));
  }
}
