import { randomUUID } from 'node:crypto';
import {
  getSessionInfo,
  type ModelInfo,
  type Options,
  query,
  type SDKMessage,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  AgentCommandOf,
  AgentConnectInput,
  VendorSession,
  VendorSessionListener,
} from '../src/agent-adapter';
import { describeError } from '../src/describe-error';
import { findExecutable } from '../src/find-executable';
import { usesSubscription } from './account';
import {
  type ConfigValues,
  changeValue,
  DEFAULT_VALUE,
  startingValues,
  toConfigOptions,
} from './config-options';

// The values the CLI starts with; the saved ones follow once its model list can check them.
const CLI_START: ConfigValues = {
  mode: 'default',
  model: DEFAULT_VALUE,
  effort: DEFAULT_VALUE,
};

export const EXECUTABLE = 'claude';
const STDERR_TAIL_LENGTH = 2000;

// Without an API key, so the CLI runs on the user's subscription (ADR-0004).
export function cliEnvironment() {
  const { ANTHROPIC_API_KEY: _apiKey, ...environment } = process.env;
  return environment;
}

// The prompts of one Session, as the streaming input `query()` reads.
function createPromptQueue() {
  const waiting: {
    message: SDKUserMessage;
    dispatched: PromiseWithResolvers<void>;
  }[] = [];
  let wake: (() => void) | null = null;
  let dispatching: PromiseWithResolvers<void> | null = null;
  let ended = false;
  async function* prompts(): AsyncGenerator<SDKUserMessage> {
    while (true) {
      const next = waiting.shift();
      if (next) {
        dispatching = next.dispatched;
        try {
          yield next.message;
        } finally {
          next.dispatched.resolve();
          dispatching = null;
        }
      } else if (ended) return;
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
      const dispatched = Promise.withResolvers<void>();
      waiting.push({ message, dispatched });
      notify();
      return dispatched.promise;
    },
    end: () => {
      ended = true;
      dispatching?.resolve();
      for (const { dispatched } of waiting.splice(0)) dispatched.resolve();
      notify();
    },
  };
}

// Images and attachments are issue 3f; text goes as written.
const toVendorContent = (content: AgentCommandOf<'agent.prompt'>['content']) =>
  content.flatMap((block) =>
    block.type === 'text' ? [{ type: 'text' as const, text: block.text }] : [],
  );

// Starts or resumes one `query()` for the life of the Session.
export async function connect(
  input: AgentConnectInput,
  listener: VendorSessionListener<SDKMessage>,
  signal: AbortSignal,
): Promise<VendorSession> {
  signal.throwIfAborted();
  const resuming = input.vendorSessionId;
  const vendorSessionId = resuming ?? randomUUID();
  let stderrTail = '';
  let stopping = false;
  const controller = new AbortController();
  const withStderr = (error: unknown) => {
    const tail = stderrTail.trim();
    return tail ? `${describeError(error)}\n${tail}` : describeError(error);
  };

  const environment = cliEnvironment();
  const executable = findExecutable(EXECUTABLE, environment);
  if (!executable) throw new Error(`No ${EXECUTABLE} executable on PATH.`);
  const options: Options = {
    abortController: controller,
    permissionMode: CLI_START.mode,
    cwd: input.cwd,
    ...(resuming ? { resume: resuming } : { sessionId: vendorSessionId }),
    env: environment,
    pathToClaudeCodeExecutable: executable,
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

  if (resuming && !(await getSessionInfo(resuming, { dir: input.cwd })))
    throw new Error(
      `Claude has no transcript for Session ${resuming} in ${input.cwd}.`,
    );

  signal.throwIfAborted();

  const queue = createPromptQueue();
  let promptDispatched = Promise.resolve();
  const abort = () => {
    stopping = true;
    queue.end();
    controller.abort();
  };
  signal.addEventListener('abort', abort, { once: true });
  const vendor = query({ prompt: queue.prompts, options });

  // Sends the vendor the values that differ from the ones it runs with.
  const applyValues = async (current: ConfigValues, next: ConfigValues) => {
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

  let models: ModelInfo[];
  let values: ConfigValues;
  try {
    const initialization = await vendor.initializationResult();
    if (!usesSubscription(initialization.account))
      throw new Error(
        'Sign in to Claude with a Claude subscription to start a Session.',
      );
    models = initialization.models;
    values = startingValues(models, input.configOptions);
    await applyValues(CLI_START, values);
  } catch (error) {
    signal.removeEventListener('abort', abort);
    queue.end();
    vendor.close();
    throw new Error(withStderr(error));
  }

  const sendUsage = async () => {
    const usage = await vendor.getContextUsage({ detail: 'summary' });
    listener.event({
      type: 'agent.usage',
      usage: { used: usage.totalTokens, size: usage.maxTokens },
    });
  };

  const messages = (async () => {
    try {
      for await (const message of vendor) {
        listener.message(message);
        // A usage request that fails as the Session closes has nothing to report.
        if (message.type === 'result') void sendUsage().catch(() => {});
      }
      if (!stopping) listener.failed(withStderr('The Claude CLI exited.'));
    } catch (error) {
      if (!stopping) listener.failed(withStderr(error));
    } finally {
      queue.end();
    }
  })();

  return {
    ready: {
      vendorSessionId,
      configOptions: toConfigOptions(models, values),
      capabilities: { planApproval: 'continueTurn', stopShell: false },
      continuedOutside: false,
    },
    run: async (command) => {
      switch (command.type) {
        case 'agent.prompt':
          promptDispatched = queue.push({
            type: 'user',
            message: {
              role: 'user',
              content: toVendorContent(command.content),
            },
            parent_tool_use_id: null,
            origin: { kind: 'human' },
          });
          return promptDispatched;
        case 'agent.cancel':
          await promptDispatched;
          if (stopping) return;
          await vendor.interrupt();
          return;
        case 'agent.setConfigOption': {
          const next = changeValue(models, values, command);
          if (!next) return;
          const current = values;
          values = next;
          await applyValues(current, next);
          listener.event({
            type: 'agent.configOptionsChanged',
            configOptions: toConfigOptions(models, next),
          });
          return;
        }
        // Answers, renames and shell stops are not wired to the CLI yet.
        default:
          return;
      }
    },
    stop: async () => {
      signal.removeEventListener('abort', abort);
      stopping = true;
      queue.end();
      vendor.close();
      await messages;
    },
  };
}
