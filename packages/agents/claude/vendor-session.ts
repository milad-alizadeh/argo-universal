import { randomUUID } from 'node:crypto';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import {
  getSessionInfo,
  type Options,
  query,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type { ContextUsage, SessionConfigOption } from '@repo/contracts';
import { z } from 'zod';
import type { AgentCommand, AgentInput } from '../src/agent-events';
import {
  type ConfigValues,
  changeValue,
  DEFAULT_VALUE,
  ModelInfo,
  savedValues,
  startingValues,
  toConfigOptions,
} from './config-options';

// What the vendor session tells the adapter machine.
export type VendorEvent =
  | {
      type: 'vendor.connected';
      vendorSessionId: string;
      runId: string;
      configOptions: SessionConfigOption[];
    }
  | { type: 'vendor.message'; message: unknown }
  | { type: 'vendor.usage'; usage: ContextUsage }
  | {
      type: 'vendor.configOptionsChanged';
      configOptions: SessionConfigOption[];
    }
  | { type: 'vendor.closed' }
  | { type: 'vendor.failed'; error: string };

export type VendorCommand = Extract<
  AgentCommand,
  {
    type:
      | 'agent.prompt'
      | 'agent.cancel'
      | 'agent.setConfigOption'
      | 'agent.stop';
  }
>;

export interface VendorSessionInput {
  agent: Omit<AgentInput, 'parent'>;
  send: (event: VendorEvent) => void;
  receive: (listener: (command: VendorCommand) => void) => void;
}

const EXECUTABLE = 'claude';
const STDERR_TAIL_LENGTH = 2000;

const InitializationResult = z.object({ models: z.array(ModelInfo) });
const ContextUsageResult = z.object({
  totalTokens: z.int(),
  maxTokens: z.int(),
});

// The user's own `claude` from PATH, so Argo runs the CLI they signed in to.
function findExecutable(environment: NodeJS.ProcessEnv) {
  for (const directory of (environment.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(directory, EXECUTABLE);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }
  throw new Error(`No ${EXECUTABLE} executable on PATH.`);
}

// The prompts of one Session, as the streaming input `query()` reads.
function createPromptQueue() {
  const waiting: SDKUserMessage[] = [];
  let wake: (() => void) | null = null;
  let ended = false;
  async function* prompts(): AsyncGenerator<SDKUserMessage> {
    while (true) {
      const next = waiting.shift();
      if (next) yield next;
      else if (ended) return;
      else await new Promise<void>((resolve) => (wake = resolve));
    }
  }
  const notify = () => {
    wake?.();
    wake = null;
  };
  return {
    prompts: prompts(),
    push: (message: SDKUserMessage) => {
      waiting.push(message);
      notify();
    },
    end: () => {
      ended = true;
      notify();
    },
  };
}

// Images and attachments are issue 3f; text goes as written.
const toVendorContent = (
  content: Extract<AgentCommand, { type: 'agent.prompt' }>['content'],
) =>
  content.flatMap((block) =>
    block.type === 'text' ? [{ type: 'text' as const, text: block.text }] : [],
  );

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// Runs one `query()` for the life of the adapter; returns the cleanup that ends it.
export function runVendorSession({ agent, send, receive }: VendorSessionInput) {
  const queue = createPromptQueue();
  const vendorSessionId = agent.vendorSessionId ?? randomUUID();
  let stderrTail = '';
  let stopping = false;
  let values: ConfigValues | null = null;
  let models: ModelInfo[] = [];

  const requested = savedValues(agent.configOptions);
  const { ANTHROPIC_API_KEY: _apiKey, ...environment } = process.env;
  const options: Options = {
    permissionMode: requested.mode,
    ...(requested.model === DEFAULT_VALUE ? {} : { model: requested.model }),
    ...(requested.effort === DEFAULT_VALUE ? {} : { effort: requested.effort }),
    cwd: agent.cwd,
    ...(agent.vendorSessionId
      ? { resume: agent.vendorSessionId }
      : { sessionId: vendorSessionId }),
    env: environment,
    pathToClaudeCodeExecutable: findExecutable(environment),
    allowDangerouslySkipPermissions: true,
    includePartialMessages: true,
    forwardSubagentText: true,
    perTaskStopAffordance: true,
    verbatimPrompts: true,
    thinking: { type: 'adaptive', display: 'summarized' },
    stderr: (text) => {
      stderrTail = `${stderrTail}${text}`.slice(-STDERR_TAIL_LENGTH);
    },
  };

  const fail = (error: unknown) => {
    const tail = stderrTail.trim();
    send({
      type: 'vendor.failed',
      error: tail ? `${describeError(error)}\n${tail}` : describeError(error),
    });
  };

  let session: ReturnType<typeof query> | null = null;

  const sendUsage = async (vendor: ReturnType<typeof query>) => {
    const reply = await vendor.getContextUsage({ detail: 'summary' });
    const usage = ContextUsageResult.safeParse(reply);
    // An unrecognised reply goes to the mapper, which reports and counts it.
    send(
      usage.success
        ? {
            type: 'vendor.usage',
            usage: { used: usage.data.totalTokens, size: usage.data.maxTokens },
          }
        : { type: 'vendor.message', message: reply },
    );
  };

  // Sends the vendor the values that differ from the ones it runs with.
  const applyValues = async (
    vendor: ReturnType<typeof query>,
    current: ConfigValues,
    next: ConfigValues,
  ) => {
    values = next;
    if (next.model !== current.model)
      await vendor.setModel(
        next.model === DEFAULT_VALUE ? undefined : next.model,
      );
    if (next.mode !== current.mode) await vendor.setPermissionMode(next.mode);
    if (next.effort !== current.effort)
      await vendor.applyFlagSettings({
        effortLevel: next.effort === DEFAULT_VALUE ? null : next.effort,
      });
  };

  // Commands run in order, so a config change lands before the prompt that follows it.
  let commands = Promise.resolve();
  receive((command) => {
    commands = commands
      .then(async () => {
        const vendor = session;
        if (command.type === 'agent.stop') {
          stopping = true;
          queue.end();
          vendor?.close();
          if (!vendor) send({ type: 'vendor.closed' });
          return;
        }
        if (!vendor) return;
        switch (command.type) {
          case 'agent.prompt':
            queue.push({
              type: 'user',
              message: {
                role: 'user',
                content: toVendorContent(command.content),
              },
              parent_tool_use_id: null,
              origin: { kind: 'human' },
            });
            return;
          case 'agent.cancel':
            await vendor.interrupt();
            return;
          case 'agent.setConfigOption': {
            const current = values;
            const next = current && changeValue(models, current, command);
            if (!current || !next) return;
            await applyValues(vendor, current, next);
            send({
              type: 'vendor.configOptionsChanged',
              configOptions: toConfigOptions(models, next),
            });
            return;
          }
        }
      })
      .catch(fail);
  });

  const run = async () => {
    if (
      agent.vendorSessionId &&
      !(await getSessionInfo(agent.vendorSessionId, { dir: agent.cwd }))
    )
      throw new Error(
        `Claude has no transcript for Session ${agent.vendorSessionId} in ${agent.cwd}.`,
      );
    if (stopping) return;
    const vendor = query({ prompt: queue.prompts, options });
    session = vendor;
    const initialization = InitializationResult.parse(
      await vendor.initializationResult(),
    );
    models = initialization.models;
    const starting = startingValues(models, agent.configOptions);
    await applyValues(vendor, requested, starting);
    send({
      type: 'vendor.connected',
      vendorSessionId,
      runId: randomUUID(),
      configOptions: toConfigOptions(models, starting),
    });
    for await (const message of vendor) {
      send({ type: 'vendor.message', message });
      // A usage request that fails as the Session closes has nothing to report.
      if (message.type === 'result') void sendUsage(vendor).catch(() => {});
    }
  };

  run().then(
    () =>
      stopping
        ? send({ type: 'vendor.closed' })
        : fail(new Error('The Claude CLI exited.')),
    (error: unknown) =>
      stopping ? send({ type: 'vendor.closed' }) : fail(error),
  );

  return () => {
    stopping = true;
    queue.end();
    session?.close();
  };
}
