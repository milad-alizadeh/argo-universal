import type { AgentCommand } from '../src/agent-events';
import { toQuestionAnswers } from '../src/elicitation-form';
import type {
  CommandExecutionRequestApprovalResponse,
  ToolRequestUserInputResponse,
} from './protocol.gen';
import { interrupt } from './turn-commands';
import type {
  VendorSessionState,
  ElicitationRequest,
} from './vendor-session-state';
type PermissionAnswer = Extract<
  AgentCommand,
  { type: 'agent.answerPermission' }
>;
type ElicitationAnswer = Extract<
  AgentCommand,
  { type: 'agent.answerElicitation' }
>;
const decision = (
  command: PermissionAnswer,
): CommandExecutionRequestApprovalResponse['decision'] =>
  command.optionId === 'allow_once' ? 'accept' : declineDecision(command);
const declineDecision = (
  command: PermissionAnswer,
): CommandExecutionRequestApprovalResponse['decision'] =>
  command.optionId === null ? 'cancel' : 'decline';
export const answerPermission = (
  state: VendorSessionState,
  command: PermissionAnswer,
): void => {
  const request = state.permissions.get(command.toolCallId);
  if (!request) return;
  state.permissions.delete(command.toolCallId);
  state.server.respond(request, { decision: decision(command) });
};
const answerContent = (
  command: ElicitationAnswer,
): ToolRequestUserInputResponse => ({ answers: questionAnswers(command) });
const questionAnswers = (
  command: ElicitationAnswer,
): ToolRequestUserInputResponse['answers'] =>
  Object.fromEntries(
    Object.entries(
      toQuestionAnswers(
        command.action === 'accept' ? command.content : undefined,
      ),
    ).map(
      ([id, answers]): [
        string,
        NonNullable<ToolRequestUserInputResponse['answers'][string]>,
      ] => [id, { answers }],
    ),
  );
const cancelBlocking = async (
  state: VendorSessionState,
  request: ElicitationRequest,
): Promise<void> => {
  try {
    const turn = state.activeTurn;
    if (turn?.id === request.params.turnId) await interrupt(state, turn);
  } finally {
    state.server.respond(request, { answers: {} });
    state.cancelRequests();
  }
};
const nextElicitation = (state: VendorSessionState): void => {
  if (state.elicitations[0])
    state.listener.message({
      ...state.elicitations[0],
      receivedAt: Date.now(),
    });
};
export const answerElicitation = async (
  state: VendorSessionState,
  command: ElicitationAnswer,
): Promise<void> => {
  const request = state.elicitations.shift();
  if (!request) return;
  if (cancelsBlocking(command, request)) {
    await cancelBlocking(state, request);
    return;
  }
  state.server.respond(request, answeredContent(command));
  nextElicitation(state);
};

const cancelsBlocking = (
  command: ElicitationAnswer,
  request: ElicitationRequest,
): boolean => command.action === 'cancel' && request.params.isBlocking;
const answeredContent = (
  command: ElicitationAnswer,
): ToolRequestUserInputResponse =>
  command.action === 'accept' ? answerContent(command) : { answers: {} };
