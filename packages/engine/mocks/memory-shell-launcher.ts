import type {
  ShellCommand,
  ShellCommandInput,
  ShellLauncher,
} from '../src/sessions';

type Exit = { exitCode: number | null; signal?: string };

export type MemoryShellCommand = ShellCommand & {
  input: ShellCommandInput;
  print: (text: string) => Promise<void>;
  exit: (exitCode: number) => void;
};

class Command implements MemoryShellCommand {
  private readonly result = Promise.withResolvers<Exit>();
  private running = true;
  public readonly exited = this.result.promise;

  public constructor(public readonly input: ShellCommandInput) {}

  public readonly isRunning = (): boolean => this.running;

  public readonly kill = (): boolean => {
    const wasRunning = this.running;

    if (wasRunning) this.end({ exitCode: null, signal: 'SIGKILL' });

    return wasRunning;
  };

  public readonly print = (text: string): Promise<void> =>
    Promise.resolve(this.input.output(Buffer.from(text)));

  public readonly exit = (exitCode: number): void => this.end({ exitCode });

  private readonly end = (status: Exit): void => {
    this.running = false;
    this.result.resolve(status);
  };
}

// Nothing runs; a test says what each command prints and when it exits.
export const memoryLauncher =
  (commands: MemoryShellCommand[]): ShellLauncher =>
  (input) => {
    const command = new Command(input);
    commands.push(command);

    return Promise.resolve(command);
  };
