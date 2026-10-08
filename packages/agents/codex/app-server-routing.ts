import { type AppServerMessage, readAppServerFrame } from './app-server-frame';
import {
  type ProcessState,
  failProcess,
  withStderr,
} from './app-server-process';
import { sendFrame } from './app-server-requests';
const requestMethods = new Set([
  'item/commandExecution/requestApproval',
  'item/fileChange/requestApproval',
  'item/tool/requestUserInput',
]);
const rejectedLinePreviewLength = 200;
interface MessageInput {
  state: ProcessState;
  message: AppServerMessage;
  onMessage: (message: AppServerMessage) => void;
}
const forwardMessage = (input: MessageInput): void => {
  if (
    input.message.id !== undefined &&
    !requestMethods.has(input.message.method)
  ) {
    rejectRequest(input);
    input.onMessage(input.message);
    return;
  }
  input.onMessage(input.message);
};
interface RouteInput {
  state: ProcessState;
  onMessage: (message: AppServerMessage) => void;
  onFailure: (error: unknown) => void;
}
const routeFrame = (input: RouteInput, line: string): void => {
  const frame = readAppServerFrame(line);
  if (frame.kind === 'message') {
    forwardMessage({ ...input, message: frame });
    return;
  }
  const entry = input.state.pending.get(frame.id);
  if (!entry)
    throw new Error(
      `Unrecognised app-server message: ${line.slice(0, rejectedLinePreviewLength)}`,
    );
  input.state.pending.delete(frame.id);
  settleResponse(input.state, frame, entry);
};
const settleResponse = (
  state: ProcessState,
  frame: Exclude<ReturnType<typeof readAppServerFrame>, { kind: 'message' }>,
  entry: NonNullable<ReturnType<ProcessState['pending']['get']>>,
): void => {
  if (frame.kind === 'error') entry.reject(withStderr(state, frame.message));
  else entry.resolve(frame.result);
};
export const routeLine = (input: RouteInput, line: string): void => {
  try {
    routeFrame(input, line);
  } catch (error) {
    failProcess(input.state, error, input.onFailure);
  }
};

const rejectRequest = (input: MessageInput): void => {
  sendFrame(input.state, {
    id: input.message.id,
    error: {
      code: -32601,
      message: `Unsupported request: ${input.message.method}`,
    },
  });
};
