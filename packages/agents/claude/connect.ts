import { randomUUID } from 'node:crypto';
import {
  getSessionInfo,
  type ModelInfo,
  type Options,
  type PermissionResult,
  query,
  type SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type { AskUserQuestionInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import type {
  AgentCommandOf,
  AgentConnectInput,
  VendorSession,
  VendorSessionListener,
} from '../src/agent-adapter';
import { UnsupportedCommandError } from '../src/agent-adapter';
import { describeError } from '../src/describe-error';
import { toQuestionAnswers } from '../src/elicitation-form';
import { findExecutable } from '../src/find-executable';
import { usesSubscription } from './account';
import {
  type ConfigValues,
  changeValue,
  DEFAULT_VALUE,
  startingValues,
  toConfigOptions,
} from './config-options';
import type { VendorMessage } from './messages';

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
export function createPromptQueue() {
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
  listener: VendorSessionListener<VendorMessage>,
  signal: AbortSignal,
): Promise<VendorSession> {
  signal.throwIfAborted();
  const resuming = input.vendorSessionId;
  const vendorSessionId = resuming ?? randomUUID();
  let stderrTail = '';
  let stopping = false;
  const controller = new AbortController();
  const toolRequests = new Map<string, (answer: PermissionResult) => void>();
  let elicitation: { toolUseId: string; input: AskUserQuestionInput } | null =
    null;
  const cancelToolRequests = () => {
    for (const resolve of toolRequests.values())
      resolve({ behavior: 'deny', message: 'Request cancelled' });
    toolRequests.clear();
    elicitation = null;
  };
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
    canUseTool: (toolName, toolInput, options) => {
      if (toolName === 'ExitPlanMode')
        return Promise.resolve({
          behavior: 'deny',
          message: 'Request answers are not implemented yet',
        });
      const answer = Promise.withResolvers<PermissionResult>();
      if (toolName === 'AskUserQuestion')
        elicitation = {
          toolUseId: options.toolUseID,
          input: toolInput as unknown as AskUserQuestionInput,
        };
      toolRequests.set(options.toolUseID, answer.resolve);
      const cancel = () => {
        toolRequests.delete(options.toolUseID);
        if (elicitation?.toolUseId === options.toolUseID) elicitation = null;
        answer.resolve({ behavior: 'deny', message: 'Request cancelled' });
      };
      options.signal.addEventListener('abort', cancel, { once: true });
      listener.message({
        type: 'control_request',
        request_id: options.requestId,
        request: {
          subtype: 'can_use_tool',
          tool_name: toolName,
          input: toolInput,
          tool_use_id: options.toolUseID,
        },
      });
      if (options.signal.aborted) cancel();
      return answer.promise.finally(() =>
        options.signal.removeEventListener('abort', cancel),
      );
    },
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
    cancelToolRequests();
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
    await applyValues(startingValues(models, []), values);
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
        listener.message({ ...message, receivedAt: Date.now() });
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
      capabilities: {
        planApproval: 'continueTurn',
        stopShell: false,
        permissionFeedback: true,
      },
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
          // Teardown already interrupts the vendor session.
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
        case 'agent.answerPermission': {
          const resolve = toolRequests.get(command.toolCallId);
          toolRequests.delete(command.toolCallId);
          resolve?.(
            command.optionId === 'allow_once'
              ? { behavior: 'allow' }
              : {
                  behavior: 'deny',
                  message:
                    command.optionId === null
                      ? 'Request cancelled'
                      : (command.message ?? 'Rejected by user'),
                },
          );
          return;
        }
        case 'agent.answerElicitation': {
          const request = elicitation;
          if (!request) return;
          elicitation = null;
          const resolve = toolRequests.get(request.toolUseId);
          toolRequests.delete(request.toolUseId);
          const answers: AskUserQuestionInput['answers'] = Object.fromEntries(
            Object.entries(
              toQuestionAnswers(
                command.action === 'accept' ? command.content : undefined,
              ),
            ).map(([id, value]) => [id, value.join(', ')]),
          );
          resolve?.(
            command.action === 'accept'
              ? {
                  behavior: 'allow',
                  updatedInput: { ...request.input, answers },
                }
              : {
                  behavior: 'deny',
                  message:
                    command.action === 'cancel'
                      ? 'Request cancelled'
                      : 'User declined to answer',
                  interrupt: command.action === 'cancel',
                },
          );
          return;
        }
        case 'agent.answerPlanProposal':
        case 'agent.rename':
        case 'agent.stopShell':
          throw new UnsupportedCommandError(command);
        default: {
          const unhandled: never = command;
          throw new UnsupportedCommandError(unhandled);
        }
      }
    },
    stop: async () => {
      signal.removeEventListener('abort', abort);
      stopping = true;
      queue.end();
      cancelToolRequests();
      vendor.close();
      await messages;
    },
  };
}
