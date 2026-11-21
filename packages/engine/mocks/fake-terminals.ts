import { createServer, type Server } from 'node:net';
import type {
  TerminalExit,
  TerminalLaunch,
  TerminalProcess,
  TerminalSpawner,
} from '../src/runs/terminal';

// A terminal that runs nothing: a test prints its output, exits it and has it claim the port, as the command it stands for would.
export class FakeTerminal implements TerminalProcess {
  public readonly pid = undefined;
  public readonly written: string[] = [];
  public stopped = false;
  private readonly data: ((data: string) => void)[] = [];
  private readonly exits: ((exit: TerminalExit) => void)[] = [];
  private server?: Server;
  private closing: Promise<void> = Promise.resolve();
  private ended = false;
  private readonly early: string[] = [];
  private exitedWith?: TerminalExit;
  public constructor(public readonly launch: TerminalLaunch) {}
  // What a terminal says before anyone listens is kept, as a pseudo-terminal keeps it.
  public onData(listener: (data: string) => void): void {
    this.data.push(listener);

    for (const text of this.early.splice(0)) listener(text);
  }
  public onExit(listener: (exit: TerminalExit) => void): void {
    this.exits.push(listener);

    if (this.exitedWith) listener(this.exitedWith);
  }
  public write(data: string): void {
    this.written.push(data);
  }
  public resize(): void {}
  public print(text: string): void {
    if (this.data.length === 0) this.early.push(text);

    for (const listener of this.data) listener(text);
  }
  // Listens on the port the Run was given, as a dev server does.
  public async listen(): Promise<void> {
    const server = createServer();
    this.server = server;

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(this.launch.port, '127.0.0.1', resolve);
    });
  }
  public exit(exitCode: number): void {
    if (this.ended) return;
    this.ended = true;
    this.closing = this.closeServer();
    this.exitedWith = { exitCode };

    for (const listener of this.exits) listener(this.exitedWith);
  }
  public async stop(): Promise<void> {
    this.stopped = true;
    this.exit(143);
    await this.closing;
  }
  // Resolves once the port is free again.
  private closeServer(): Promise<void> {
    const { server } = this;

    if (!server?.listening) return Promise.resolve();

    return new Promise((resolve) => server.close(() => resolve()));
  }
}

type FakeTerminals = {
  spawn: TerminalSpawner;
  // Every terminal started so far, oldest first.
  started: FakeTerminal[];
  // Ends every terminal; a test registers it once its Engine has started, so it runs before the Engine stops.
  end: () => Promise<void>;
  // The next terminal to start, now or once it does.
  next: () => Promise<FakeTerminal>;
};

export function createFakeTerminals(): FakeTerminals {
  const started: FakeTerminal[] = [];
  const waiting: ((terminal: FakeTerminal) => void)[] = [];
  let taken = 0;

  return {
    started,
    end: async (): Promise<void> => {
      await Promise.all(started.map((terminal) => terminal.stop()));
    },
    spawn: (launch): FakeTerminal => {
      const terminal = new FakeTerminal(launch);
      started.push(terminal);
      waiting.shift()?.(terminal);

      return terminal;
    },
    next: (): Promise<FakeTerminal> => {
      const ready = started[taken];

      if (ready) {
        taken += 1;

        return Promise.resolve(ready);
      }

      return new Promise((resolve) => {
        waiting.push((terminal) => {
          taken += 1;
          resolve(terminal);
        });
      });
    },
  };
}
