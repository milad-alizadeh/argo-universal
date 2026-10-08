import type { AppServerMessage } from './app-server-frame';
import type { VendorMessage } from './messages';
import { isIgnoredMethod } from './notification-kinds';
import { isVendorMessage } from './payloads';
import {
  type VendorSessionState,
  type PermissionRequest,
  type ElicitationRequest,
  createVendorTurn,
} from './vendor-session-state';
const permissionRequest = (
  state: VendorSessionState,
  message: PermissionRequest,
): boolean => {
  if (message.params.threadId !== state.vendorSessionId) {
    state.server.respond(message, { decision: 'decline' });
    return false;
  }
  state.permissions.set(message.params.itemId, message);
  return true;
};
const elicitationRequest = (
  state: VendorSessionState,
  message: ElicitationRequest,
): boolean => {
  if (message.params.threadId !== state.vendorSessionId) {
    state.server.respond(message, { answers: {} });
    return false;
  }
  state.elicitations.push(message);
  return state.elicitations.length === 1;
};
const queueRequest = (
  state: VendorSessionState,
  message: VendorMessage,
): boolean => {
  if (message.method === 'item/tool/requestUserInput')
    return elicitationRequest(state, message);
  return queuePermission(state, message);
};
const queuePermission = (
  state: VendorSessionState,
  message: VendorMessage,
): boolean => {
  if (
    message.method === 'item/commandExecution/requestApproval' ||
    message.method === 'item/fileChange/requestApproval'
  )
    return permissionRequest(state, message);
  return true;
};
const sameVendorTurn = (state: VendorSessionState, id: string): boolean =>
  state.activeTurn !== null && pendingOrSameTurn(state.activeTurn, id);
const startedTurn = (
  state: VendorSessionState,
  message: VendorMessage,
): void => {
  if (message.method !== 'turn/started') return;
  if (!sameVendorTurn(state, message.params.turn.id))
    state.activeTurn = createVendorTurn();
  identifyTurn(state, message.params.turn.id);
};
const completedTurn = (
  state: VendorSessionState,
  message: VendorMessage,
): void => {
  if (message.method !== 'turn/completed') return;
  completeIdentifiedTurn(state, message.params.turn.id);
};
const deliverNotification = (
  state: VendorSessionState,
  message: VendorMessage,
): void => {
  if (!queueRequest(state, message)) return;
  if (message.params.threadId !== state.vendorSessionId) return;
  startedTurn(state, message);
  state.listener.message({ ...message, receivedAt: Date.now() });
  completedTurn(state, message);
};
const rejectMessage = (state: VendorSessionState): void =>
  state.listener.event({
    type: 'agent.messageRejected',
    reason: 'Unrecognised app-server payload',
  });
export const receiveMessage = (
  state: VendorSessionState,
  message: AppServerMessage,
): void => {
  if (isIgnoredMethod(message.method)) return;
  if (!isVendorMessage(message)) {
    rejectMessage(state);
    return;
  }
  deliverNotification(state, message);
};

const pendingOrSameTurn = (
  turn: NonNullable<VendorSessionState['activeTurn']>,
  id: string,
): boolean => turn.id === null || turn.id === id;

const identifyTurn = (state: VendorSessionState, id: string): void => {
  const turn = state.activeTurn;
  if (!turn) return;
  turn.id = id;
  turn.identity.resolve(id);
};
const completeIdentifiedTurn = (
  state: VendorSessionState,
  id: string,
): void => {
  const turn = state.activeTurn;
  if (!turn) return;
  if (turn.id !== id) return;
  turn.completed = true;
  turn.identity.resolve(null);
  turn.completion.resolve();
  state.activeTurn = null;
  state.cancelRequests();
};
