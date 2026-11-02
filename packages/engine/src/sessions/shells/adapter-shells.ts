import { z } from 'zod';
import type { AcpSessionDestination } from '../../agents';
import { AdapterShell } from './adapter-shell';
import type { ShellCaptureInput } from './shell-capture';

type Notification = Parameters<AcpSessionDestination['update']>[0];

const Ended = z.object({ exit_code: z.int().nullable() });

// claude-agent-acp's Tool result for a command it put in the background.
const taskFile =
  /^Command running in background with ID: \S+\. Output is being written to: (\S+\.output)\./;

const Output = z.object({ data: z.string() });

// Only a command the Agent put in the background outlives its Tool call, so only that is a Shell.
const Background = z.object({
  command: z.string(),
  description: z.string().trim().min(1).nullable().catch(null),
  run_in_background: z.literal(true),
});

// What an Agent that runs its own terminals says about one in a Tool call: the command, where its output goes, and its end.
const ToolUpdate = z.object({
  sessionUpdate: z.enum(['tool_call', 'tool_call_update']),
  toolCallId: z.string(),
  status: z.string().nullish(),
  rawInput: Background.nullable().catch(null),
  _meta: z
    .looseObject({
      terminal_output_delta: Output.nullable().catch(null),
      terminal_exit: Ended.nullable().catch(null),
    })
    .nullable()
    .catch(null),
});

type Background = z.infer<typeof Background>;

type Update = z.infer<typeof ToolUpdate>;

const outputOf = ({ _meta }: Update): string | undefined =>
  _meta?.terminal_output_delta?.data;

const taskFileIn = (output = ''): string | undefined =>
  taskFile.exec(output)?.[1];

const reportsEnd = ({ _meta }: Update): boolean =>
  Boolean(_meta?.terminal_exit);

type Input = Omit<
  ShellCaptureInput,
  'id' | 'request' | 'command' | 'description' | 'cwd' | 'path'
> & {
  outputPath: (id: string) => string;
  // The Session's Checkout, known only once the Session is configured: claude-agent-acp names no cwd for its terminals.
  cwd: () => string;
};

// Shells of an Agent that runs its own terminals and reports them in Tool call metadata, as claude-agent-acp does. It owns no process, so a Shell here cannot be stopped from Argo.
export class AdapterShells {
  private readonly shells = new Map<string, AdapterShell>();
  public constructor(private readonly input: Input) {}
  // Whether the notification was only this Shell's end, which nothing else needs: it can come long after its Turn settled.
  public observe({ update }: Notification): boolean {
    const read = ToolUpdate.safeParse(update);

    return read.success && this.apply(read.data);
  }
  private apply(update: Update): boolean {
    this.start(update);
    this.follow(update);

    return this.end(update);
  }
  private start({ toolCallId: id, rawInput }: Update): void {
    if (rawInput && !this.shells.has(id)) this.open(id, rawInput);
  }
  private open(id: string, { command, description }: Background): void {
    const shell = new AdapterShell({
      ...this.input,
      id,
      cwd: this.input.cwd(),
      command,
      description,
      path: this.input.outputPath(id),
      request: { sessionId: '', command },
    });

    this.shells.set(id, shell);
  }
  private follow(update: Update): void {
    const path = taskFileIn(outputOf(update));

    if (path) this.shells.get(update.toolCallId)?.follow(path);
  }
  private end(update: Update): boolean {
    const shell = this.shells.get(update.toolCallId);

    if (!shell || !reportsEnd(update)) return false;

    void shell.end().catch(this.input.failed);

    return !update.status;
  }
  // The Session closed: whatever still runs is recorded with the status.
  public async close(status: 'lost' | 'stopped'): Promise<void> {
    const shells = [...this.shells.values()];
    await Promise.all(shells.map((shell) => shell.close(status)));
  }
}
