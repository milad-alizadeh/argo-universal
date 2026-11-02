import { z } from 'zod';
import type { AcpSessionDestination } from '../../agents';
import { createShellOutput } from './files';
import { ShellCapture, type ShellCaptureInput } from './shell-capture';

type Notification = Parameters<AcpSessionDestination['update']>[0];

const Ended = z.object({ exit_code: z.int().nullable() });

// Only a command the Agent put in the background outlives its Tool call, so only that is a Shell.
const Background = z.object({
  command: z.string(),
  run_in_background: z.literal(true),
});

// What an Agent that runs its own terminals says about one in a Tool call: the command, and its end.
const ToolUpdate = z.object({
  sessionUpdate: z.enum(['tool_call', 'tool_call_update']),
  toolCallId: z.string(),
  rawInput: Background.nullable().catch(null),
  _meta: z
    .looseObject({
      terminal_exit: Ended.nullable().catch(null),
    })
    .nullable()
    .catch(null),
});

type Input = Omit<
  ShellCaptureInput,
  'id' | 'request' | 'command' | 'cwd' | 'path'
> & {
  outputPath: (id: string) => string;
  // The Session's Checkout: claude-agent-acp names no cwd for its terminals.
  cwd: () => string;
};

// Shells of an Agent that runs its own terminals and reports them in Tool call metadata, as claude-agent-acp does. It owns no process, so a Shell here cannot be stopped from Argo.
export class AdapterShells {
  private readonly seen = new Set<string>();
  private readonly running = new Map<string, ShellCapture>();
  public constructor(private readonly input: Input) {}
  public observe({ update }: Notification): void {
    const read = ToolUpdate.safeParse(update);

    if (read.success) this.apply(read.data);
  }
  private apply(update: z.infer<typeof ToolUpdate>): void {
    const id = update.toolCallId;

    this.start(id, update.rawInput);
    this.end(id, update._meta?.terminal_exit);
  }
  private start(id: string, input: z.infer<typeof Background> | null): void {
    if (input && !this.seen.has(id)) this.open(id, input.command);
  }
  private open(id: string, command: string): void {
    const path = this.input.outputPath(id);
    const capture = this.capture(id, command, path);

    this.seen.add(id);
    this.running.set(id, capture);
    void createShellOutput(path)
      .then(() => capture.associate(id))
      .catch(this.input.failed);
  }
  private capture(id: string, command: string, path: string): ShellCapture {
    return new ShellCapture({
      ...this.input,
      id,
      cwd: this.input.cwd(),
      command,
      path,
      request: { sessionId: '', command },
    });
  }
  private end(
    id: string,
    exit: z.infer<typeof Ended> | null | undefined,
  ): void {
    const capture = this.running.get(id);

    if (!exit || !capture) return;

    this.running.delete(id);
    void capture
      .end('exited', { exitCode: exit.exit_code })
      .catch(this.input.failed);
  }
  // The Session closed: whatever still runs is recorded with the status.
  public async close(status: 'lost' | 'stopped'): Promise<void> {
    const captures = [...this.running.values()];
    this.running.clear();
    await Promise.all(captures.map((capture) => capture.end(status, {})));
  }
}
