import { createInterface } from 'node:readline';
import type { UsageLimit } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import type {
  AccountUsageProtocol,
  AccountUsageReader,
  StatusReply,
} from './account-usage-protocol';
import {
  type AcpChild,
  launchAgentStatus,
  stopAgentStatus,
} from './acp/process';
import type { AgentLaunch } from './agent-launch';
import type { AccountJson } from './vendor-usage-reading';

const readDeadlineMs = 15_000;

const bytesPerKibibyte = 1024;

const outputBudget = bytesPerKibibyte ** 2;

const rejections = createRejectionCounter('Agent account Usage responses');

const Json = z.json();

function parseLine(line: string): AccountJson | undefined {
  try {
    return Json.parse(JSON.parse(line));
  } catch {
    rejections.report('Invalid JSON frame');

    return undefined;
  }
}

function parseReply(
  line: string,
  protocol: AccountUsageProtocol,
  id: number,
): StatusReply | undefined {
  const message = parseLine(line);

  return message === undefined ? undefined : protocol.response(message, id);
}

class StatusConnection {
  private readonly reader;
  private readonly lines;
  private bytes = 0;
  private stopped = false;
  public constructor(private readonly child: AcpChild) {
    this.reader = createInterface({ input: child.stdout, crlfDelay: Infinity });
    this.lines = this.reader[Symbol.asyncIterator]();
    child.stdout.on('data', this.countBytes);
    child.stderr.resume();
    child.stdin.on('error', this.close);
    child.on('error', this.close);
  }
  private readonly countBytes = (chunk: Buffer): void => {
    this.bytes += chunk.length;

    if (this.bytes <= outputBudget) return;
    rejections.report('Output exceeded the Usage response budget');
    this.close();
  };
  public readonly close = (): void => {
    if (this.stopped) return;
    this.stopped = true;
    this.reader.close();
    this.child.stdin.end();
    stopAgentStatus(this.child);
  };
  public send(message: AccountJson): void {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }
  public async reply(
    protocol: AccountUsageProtocol,
    id: number,
  ): Promise<StatusReply | undefined> {
    const next = await this.lines.next();

    if (next.done || this.stopped) return;

    return this.matchReply(next.value, protocol, id);
  }
  private matchReply(
    line: string,
    protocol: AccountUsageProtocol,
    id: number,
  ): Promise<StatusReply | undefined> {
    const reply = parseReply(line, protocol, id);

    return reply ? Promise.resolve(reply) : this.reply(protocol, id);
  }
  public get closed(): boolean {
    return this.stopped;
  }
}

async function readStatus(
  connection: StatusConnection,
  protocol: AccountUsageProtocol,
): Promise<StatusReply | undefined> {
  connection.send(protocol.initialize);
  const ready = await connection.reply(protocol, 1);

  if (ready?.failed !== false) return;

  sendRead(connection, protocol);

  return connection.reply(protocol, 2);
}

function sendRead(
  connection: StatusConnection,
  protocol: AccountUsageProtocol,
): void {
  if (protocol.initialized) connection.send(protocol.initialized);
  connection.send(protocol.read);
}

function readingsFrom(
  result: AccountJson | undefined,
  reader: AccountUsageReader,
): UsageLimit[] | undefined {
  if (result === undefined) return;
  const readings = reader.decode(result, new Date().toISOString());

  if (!readings) rejections.report('Unrecognized Usage snapshot');

  return readings;
}

export async function readAccountUsage(
  launch: AgentLaunch,
  reader: AccountUsageReader,
  cancellation: AbortSignal,
): Promise<UsageLimit[] | undefined> {
  const signal = AbortSignal.any([
    AbortSignal.timeout(readDeadlineMs),
    cancellation,
  ]);

  const child = await launchAgentStatus(
    statusCommand(launch, reader.protocol),
    signal,
  );

  return runStatus(new StatusConnection(child), reader, signal);
}

function statusCommand(
  launch: AgentLaunch,
  protocol: AccountUsageProtocol,
): AgentLaunch {
  return { ...launch, args: [...launch.args, ...protocol.args] };
}

async function runStatus(
  connection: StatusConnection,
  reader: AccountUsageReader,
  signal: AbortSignal,
): Promise<UsageLimit[] | undefined> {
  signal.addEventListener('abort', connection.close, { once: true });

  try {
    const reply = await readStatus(connection, reader.protocol);

    return connection.closed ? undefined : readingsFrom(reply?.result, reader);
  } finally {
    signal.removeEventListener('abort', connection.close);
    connection.close();
  }
}
