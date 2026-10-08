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
import { isKnownMessage } from './known-messages';
import type { VendorMessage } from './messages';

const cancelledRequestReason = 'Request cancelled';

// The values the CLI starts with; the saved ones follow once its model list can check them.
const CLI_START: ConfigValues = {
  mode: 'default',
  model: DEFAULT_VALUE,
  effort: DEFAULT_VALUE,
};

export const EXECUTABLE = 'claude';
const STDERR_TAIL_LENGTH = 2000;
const requestCancellationLimitMs = 3000;

// Without an API key, so the CLI runs on the user's subscription (ADR-0004).
export function cliEnvironment(): { [key: string]: string | undefined } {
  const { ANTHROPIC_API_KEY: _apiKey, ...environment } = process.env;
  return environment;
}

// The prompts of one Session, as the streaming input `query()` reads.
export function createPromptQueue(): {
  prompts: ReturnType<typeof prompts>;
  push: (message: SDKUserMessage) => Promise<void>;
  end: () => void;
} {
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
      else
        await new Promise<void>(
          (resolve): ((value: void | PromiseLike<void>) => void) =>
            (wake = resolve),
        );
    }
  }
  const notify = (): void => {
    wake?.();
    wake = null;
  };
  return {
    prompts: prompts(),
    push: (message: SDKUserMessage): Promise<void> => {
      const dispatched = Promise.withResolvers<void>();
      waiting.push({ message, dispatched });
      notify();
      return dispatched.promise;
    },
    end: (): void => {
      ended = true;
      dispatching?.resolve();
      for (const { dispatched } of waiting.splice(0)) dispatched.resolve();
      notify();
    },
  };
}

// Images and attachments are issue 3f; text goes as written.
const toVendorContent = (
  content: AgentCommandOf<'agent.prompt'>['content'],
): Pick<
  Extract<
    Exclude<SDKUserMessage['message']['content'], string>[number],
    { type: 'text' }
  >,
  'type' | 'text'
>[] =>
  content.flatMap((block): { type: 'text'; text: string }[] =>
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
  const requests = createRequestTracker(listener);
  const withStderr = (error: unknown): string => {
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
    canUseTool: (
      toolName,
      toolInput,
      options,
    ):
      | Promise<{ behavior: 'deny'; message: string }>
      | Promise<PermissionResult> => {
      if (toolName === 'ExitPlanMode')
        return Promise.resolve({
          behavior: 'deny',
          message: 'Request answers are not implemented yet',
        });
      const answer = Promise.withResolvers<PermissionResult>();
      const message: VendorMessage = {
        type: 'control_request',
        request_id: options.requestId,
        request: {
          subtype: 'can_use_tool',
          tool_name: toolName,
          input: toolInput,
          tool_use_id: options.toolUseID,
        },
      };
      requests.add(message, answer.resolve);
      const cancel = (): void | undefined =>
        requests
          .remove(options.toolUseID)
          ?.resolve({ behavior: 'deny', message: cancelledRequestReason });
      options.signal.addEventListener('abort', cancel, { once: true });
      if (options.signal.aborted) cancel();
      return answer.promise.finally((): void =>
        options.signal.removeEventListener('abort', cancel),
      );
    },
    thinking: { type: 'adaptive', display: 'summarized' },
    stderr: (text): void => {
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
  const abort = (): void => {
    stopping = true;
    queue.end();
    void stopRequests().finally((): void => controller.abort());
  };
  signal.addEventListener('abort', abort, { once: true });
  const vendor = query({ prompt: queue.prompts, options });
  let stoppingRequests: Promise<void> | undefined;
  const stopRequests = (): Promise<void> =>
    (stoppingRequests ??= (async (): Promise<undefined> => {
      if (!requests.cancel()) return;
      // An interrupt acknowledgement lets the SDK flush denied requests before closing its pipe.
      await new Promise<void>((resolve): void => {
        const deadline = setTimeout(resolve, requestCancellationLimitMs);
        void vendor
          .interrupt()
          .catch((): void => {})
          .finally((): void => {
            clearTimeout(deadline);
            resolve();
          });
      });
    })());

  // Sends the vendor the values that differ from the ones it runs with.
  const applyValues = async (
    current: ConfigValues,
    next: ConfigValues,
  ): Promise<void> => {
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

  const sendUsage = async (): Promise<void> => {
    const usage = await vendor.getContextUsage({ detail: 'summary' });
    listener.event({
      type: 'agent.usage',
      usage: { used: usage.totalTokens, size: usage.maxTokens },
    });
  };

  const messages = (async (): Promise<void> => {
    try {
      for await (const message of vendor) {
        if (isKnownMessage(message))
          listener.message({ ...message, receivedAt: Date.now() });
        else
          listener.event({
            type: 'agent.messageRejected',
            reason: `Unsupported SDK message: ${message.type}`,
          });
        // Usage failures are ignored; the streamed Turn still supplies its Feed.
        if (message.type === 'result') void sendUsage().catch((): void => {});
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
    run: async (command): Promise<void> => {
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
          requests.cancel();
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
        case 'agent.answerPlanProposal':
        case 'agent.rename':
        case 'agent.stopShell':
          throw new UnsupportedCommandError(command);
        case 'agent.answerPermission': {
          const resolve = requests.remove(command.toolCallId)?.resolve;
          resolve?.(
            command.optionId === 'allow_once'
              ? { behavior: 'allow' }
              : {
                  behavior: 'deny',
                  message:
                    command.optionId === null
                      ? cancelledRequestReason
                      : (command.message ?? 'Rejected by user'),
                },
          );
          return;
        }
        case 'agent.answerElicitation': {
          const request = requests.head();
          if (!request) return;
          const resolve = requests.remove(
            request.toolUseId,
            command.action !== 'cancel',
          )?.resolve;
          const answers: AskUserQuestionInput['answers'] = Object.fromEntries(
            Object.entries(
              toQuestionAnswers(
                command.action === 'accept' ? command.content : undefined,
              ),
            ).map(([id, value]): [string, string] => [id, value.join(', ')]),
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
                      ? cancelledRequestReason
                      : 'User declined to answer',
                  interrupt: command.action === 'cancel',
                },
          );
          if (command.action === 'cancel') requests.cancel();
          return;
        }
        default: {
          const unhandled: never = command;
          throw new UnsupportedCommandError(unhandled);
        }
      }
    },
    stop: async (): Promise<void> => {
      signal.removeEventListener('abort', abort);
      stopping = true;
      queue.end();
      await stopRequests();
      vendor.close();
      await messages;
    },
  };
}

// Owns SDK request resolution and exposes only the first unanswered question.
function createRequestTracker(listener: VendorSessionListener<VendorMessage>): {
  add: (
    message: Extract<VendorMessage, { type: 'control_request' }> & {
      receivedAt?: number;
    },
    resolve: (answer: PermissionResult) => void,
  ) => void;
  head: () => { toolUseId: string; input: Record<string, unknown> } | undefined;
  remove: (
    id: string,
    advance?: boolean,
  ) =>
    | {
        resolve: (answer: PermissionResult) => void;
        message: Extract<VendorMessage, { type: 'control_request' }>;
      }
    | undefined;
  cancel: () => number;
} {
  type Request = {
    resolve: (answer: PermissionResult) => void;
    message: Extract<VendorMessage, { type: 'control_request' }>;
  };
  const pending = new Map<string, Request>();
  const questions: string[] = [];
  return {
    add: (message: Request['message'], resolve: Request['resolve']): void => {
      if (message.request.subtype !== 'can_use_tool') return;
      const id = message.request.tool_use_id;
      pending.set(id, { resolve, message });
      if (message.request.tool_name === 'AskUserQuestion') {
        questions.push(id);
        if (questions.length > 1) return;
      }
      listener.message(message);
    },
    head: ():
      | { toolUseId: string; input: Record<string, unknown> }
      | undefined => {
      const id = questions[0];
      if (!id) return;
      const request = pending.get(id)?.message.request;
      if (request?.subtype !== 'can_use_tool') return;
      // AskUserQuestionInput is the SDK's tool payload at this boundary.
      return {
        toolUseId: id,
        input: request.input,
      };
    },
    remove: (
      id: string,
      advance = true,
    ):
      | {
          resolve: (answer: PermissionResult) => void;
          message: Extract<VendorMessage, { type: 'control_request' }>;
        }
      | undefined => {
      const request = pending.get(id);
      pending.delete(id);
      const index = questions.indexOf(id);
      if (index >= 0) questions.splice(index, 1);
      const next = questions[0] ? pending.get(questions[0]) : undefined;
      if (advance && index === 0 && next) listener.message(next.message);
      return request;
    },
    cancel: (): number => {
      const cancelled = [...pending.values()];
      pending.clear();
      questions.length = 0;
      for (const request of cancelled)
        request.resolve({ behavior: 'deny', message: cancelledRequestReason });
      return cancelled.length;
    },
  };
}
