import type {
  ModelInfo,
  Query,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  AgentCommandOf,
  VendorSession,
  VendorSessionListener,
} from '../src/agent-adapter';
import { UnsupportedCommandError } from '../src/agent-adapter';
import { applyValues } from './apply-values';
import {
  changeValue,
  toConfigOptions,
  type ConfigValues,
} from './config-options';
import type { VendorMessage } from './messages';
import type { createPromptQueue } from './prompt-queue';
import { answerElicitation, answerPermission } from './request-answers';
import type { Requests } from './request-tracker';
import type { Lifetime } from './session-lifetime';
type CommandsInput = {
  vendor: Query;
  listener: VendorSessionListener<VendorMessage>;
  lifetime: Lifetime;
  queue: ReturnType<typeof createPromptQueue>;
  requests: Requests;
  models: ModelInfo[];
  values: ConfigValues;
};
type Command = Parameters<VendorSession['run']>[0];
class SessionCommands {
  private input: CommandsInput;
  private values: ConfigValues;
  private promptDispatched = Promise.resolve();
  public constructor(input: CommandsInput) {
    this.input = input;
    this.values = input.values;
  }
  public run(command: Command): Promise<void> {
    return runCommand(command, {
      requests: this.input.requests,
      prompt: this.prompt,
      cancel: this.cancel,
      config: this.config,
    });
  }
  private prompt = (command: AgentCommandOf<'agent.prompt'>): Promise<void> =>
    (this.promptDispatched = this.input.queue.push(userPrompt(command)));
  private cancel = async (): Promise<void> => {
    this.input.requests.cancel();
    await this.promptDispatched;
    if (!this.input.lifetime.isStopping()) await this.input.vendor.interrupt();
  };
  private config = async (
    command: AgentCommandOf<'agent.setConfigOption'>,
  ): Promise<void> => {
    const next = changeValue(this.input.models, this.values, command);
    if (!next) return;
    const current = this.values;
    this.values = next;
    await applyValues(this.input.vendor, current, next);
    this.input.listener.event({
      type: 'agent.configOptionsChanged',
      configOptions: toConfigOptions(this.input.models, next),
    });
  };
}
export function sessionCommands(input: CommandsInput): VendorSession['run'] {
  const commands = new SessionCommands(input);
  return (command): Promise<void> => commands.run(command);
}
type Dispatch = Pick<CommandsInput, 'requests'> & {
  prompt: (command: AgentCommandOf<'agent.prompt'>) => Promise<void>;
  cancel: () => Promise<void>;
  config: (command: AgentCommandOf<'agent.setConfigOption'>) => Promise<void>;
};
async function runCommand(command: Command, dispatch: Dispatch): Promise<void> {
  if (command.type === 'agent.prompt') return dispatch.prompt(command);
  if (command.type === 'agent.cancel') return dispatch.cancel();
  return runConfigOrAnswer(command, dispatch);
}
async function runConfigOrAnswer(
  command: ConfigurationCommand,
  dispatch: Dispatch,
): Promise<void> {
  if (command.type === 'agent.setConfigOption') return dispatch.config(command);
  if (command.type === 'agent.answerPermission')
    return answerPermission(dispatch.requests, command);
  return runElicitation(command, dispatch.requests);
}
async function runElicitation(
  command: AnswerCommand,
  requests: Requests,
): Promise<void> {
  if (command.type === 'agent.answerElicitation')
    return answerElicitation(requests, command);
  return unsupported(command);
}
function userPrompt(command: AgentCommandOf<'agent.prompt'>): SDKUserMessage {
  return {
    type: 'user',
    message: { role: 'user', content: toVendorContent(command.content) },
    parent_tool_use_id: null,
    origin: { kind: 'human' },
  };
}
const toVendorContent = (
  content: AgentCommandOf<'agent.prompt'>['content'],
): Extract<
  Exclude<SDKUserMessage['message']['content'], string>[number],
  { type: 'text' }
>[] =>
  content.flatMap(
    (
      block,
    ): Extract<
      Exclude<SDKUserMessage['message']['content'], string>[number],
      { type: 'text' }
    >[] => (block.type === 'text' ? [{ type: 'text', text: block.text }] : []),
  );

type ConfigurationCommand = Exclude<
  Command,
  { type: 'agent.prompt' | 'agent.cancel' }
>;
type AnswerCommand = Exclude<
  ConfigurationCommand,
  { type: 'agent.setConfigOption' | 'agent.answerPermission' }
>;
type UnsupportedCommand = AgentCommandOf<
  'agent.answerPlanProposal' | 'agent.rename' | 'agent.stopShell'
>;
function unsupported(command: UnsupportedCommand): never {
  throw new UnsupportedCommandError(command);
}
