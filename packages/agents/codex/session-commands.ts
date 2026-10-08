import { UnsupportedCommandError } from '../src/agent-adapter';
import type { VendorSession } from '../src/agent-adapter';
import type { VendorCommand as AgentCommand } from '../src/agent-adapter';
import {
  type ConfigValues,
  type Model,
  changeValue,
  toConfigOptions,
} from './config-options';
import type { UserInput } from './protocol.gen';
import { answerElicitation, answerPermission } from './request-answers';
import { prompt, cancel } from './turn-commands';
import type { VendorSessionState } from './vendor-session-state';
interface CommandState {
  session: VendorSessionState;
  models: Model[];
  values: ConfigValues;
}
const textInput = (
  command: Extract<AgentCommand, { type: 'agent.prompt' }>,
): UserInput[] =>
  command.content.flatMap((block): Extract<UserInput, { type: 'text' }>[] =>
    block.type === 'text'
      ? [{ type: 'text', text: block.text, text_elements: [] }]
      : [],
  );
const setConfig = (
  state: CommandState,
  command: Extract<AgentCommand, { type: 'agent.setConfigOption' }>,
): void => {
  const next = changeValue(state.models, state.values, command);
  if (!next) return;
  state.values = next;
  state.session.listener.event({
    type: 'agent.configOptionsChanged',
    configOptions: toConfigOptions(state.models, state.values),
  });
};
const answerCommand = async (
  state: CommandState,
  command: AgentCommand,
): Promise<void> => {
  if (command.type === 'agent.answerPermission') {
    answerPermission(state.session, command);
    return;
  }
  if (command.type === 'agent.answerElicitation') {
    await answerElicitation(state.session, command);
    return;
  }
  throw new UnsupportedCommandError(command);
};
const configureOrAnswer = async (
  state: CommandState,
  command: AgentCommand,
): Promise<void> => {
  if (command.type === 'agent.setConfigOption') {
    setConfig(state, command);
    return;
  }
  await answerCommand(state, command);
};
const runCommand = async (
  state: CommandState,
  command: AgentCommand,
): Promise<void> => {
  if (command.type === 'agent.prompt') {
    await prompt(state.session, textInput(command), state.values);
    return;
  }
  if (command.type === 'agent.cancel') {
    await cancel(state.session);
    return;
  }
  await configureOrAnswer(state, command);
};
export const commandRunner = (
  session: VendorSessionState,
  models: Model[],
  values: ConfigValues,
): VendorSession['run'] => {
  const state: CommandState = { session, models, values };
  return (command): Promise<void> => runCommand(state, command);
};
