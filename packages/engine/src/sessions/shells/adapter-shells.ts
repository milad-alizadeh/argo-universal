import { z } from 'zod';
import type { AcpSessionDestination } from '../../agents';
import { createShellOutput } from './files';
import { ShellCapture, type ShellCaptureInput } from './shell-capture';

type Notification = Parameters<AcpSessionDestination['update']>[0];

const Started = z.object({ cwd: z.string() });

const Ended = z.object({ exit_code: z.int().nullable() });

// Only a command the Agent put in the background outlives its Tool call, so only that is a Shell.
const Background = z.object({
  command: z.string(),
  run_in_background: z.literal(true),
});

// What an Agent that runs its own terminals says about one in a Tool call: where it started, the command, and its end.
const ToolUpdate = z.object({
  sessionUpdate: z.enum(['tool_call', 'tool_call_update']),
  toolCallId: z.string(),
  rawInput: Background.nullable().catch(null),
  _meta: z
    .looseObject({
      terminal_info: Started.nullable().catch(null),
      terminal_exit: Ended.nullable().catch(null),
    })
    .nullable()
    .catch(null),
});

const Ready = z.object({ cwd: z.string(), command: z.string() });

type Known = Partial<z.infer<typeof Ready>>;

type Input = Omit<
  ShellCaptureInput,
  'id' | 'request' | 'command' | 'cwd' | 'path'
> & {
  outputPath: (id: string) => string;
};

// Shells of an Agent that runs its own terminals and reports them in Tool call metadata, as claude-agent-acp does. It owns no process, so a Shell here cannot be stopped from Argo.
export class AdapterShells {
  private readonly known = new Map<string, Known>();
  private readonly running = new Map<string, ShellCapture>();
  public constructor(private readonly input: Input) {}
  public observe({ update }: Notification): void {
    const read = ToolUpdate.safeParse(update);

    if (read.success) this.apply(read.data);
  }
  private apply(update: z.infer<typeof ToolUpdate>): void {
    const id = update.toolCallId;

    const known: Known = {
      ...this.known.get(id),
      ...update._meta?.terminal_info,
      ...update.rawInput,
    };

    this.known.set(id, known);
    this.start(id, known);
    this.end(id, update._meta?.terminal_exit);
  }
  private start(id: string, known: Known): void {
    const ready = Ready.safeParse(known);

    if (ready.success && !this.running.has(id)) this.open(id, ready.data);
  }
  private open(id: string, { cwd, command }: z.infer<typeof Ready>): void {
    const path = this.input.outputPath(id);

    const capture = new ShellCapture({
      ...this.input,
      id,
      cwd,
      command,
      path,
      request: { sessionId: '', command },
    });

    this.running.set(id, capture);
    void createShellOutput(path)
      .then(() => capture.associate(id))
      .catch(this.input.failed);
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
