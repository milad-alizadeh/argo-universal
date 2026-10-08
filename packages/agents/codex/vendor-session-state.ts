import type {
  AgentConnectInput,
  VendorSessionListener,
} from '../src/agent-adapter';
import type { VendorMessage } from './messages';
import type { openAppServer } from './open-app-server';
export interface VendorTurn {
  id: string | null;
  identity: PromiseWithResolvers<string | null>;
  completion: PromiseWithResolvers<void>;
  completed: boolean;
  interrupted?: Promise<void>;
}
export const createVendorTurn = (): VendorTurn => ({
  id: null,
  identity: Promise.withResolvers<string | null>(),
  completion: Promise.withResolvers<void>(),
  completed: false,
});
export type PermissionRequest = Extract<
  VendorMessage,
  {
    method:
      | 'item/commandExecution/requestApproval'
      | 'item/fileChange/requestApproval';
  }
>;
export type ElicitationRequest = Extract<
  VendorMessage,
  { method: 'item/tool/requestUserInput' }
>;
export interface VendorSessionState {
  vendorSessionId: AgentConnectInput['vendorSessionId'];
  activeTurn: VendorTurn | null;
  permissions: Map<string, PermissionRequest>;
  elicitations: ElicitationRequest[];
  server: ReturnType<typeof openAppServer>;
  listener: VendorSessionListener<VendorMessage>;
  signal: AbortSignal;
  cancelRequests: () => void;
}
interface SessionStateInput {
  connect: AgentConnectInput;
  server: VendorSessionState['server'];
  listener: VendorSessionState['listener'];
  signal: AbortSignal;
  cancelRequests: () => void;
}
export const sessionState = (input: SessionStateInput): VendorSessionState => ({
  vendorSessionId: input.connect.vendorSessionId,
  activeTurn: null,
  permissions: new Map(),
  elicitations: [],
  server: input.server,
  listener: input.listener,
  signal: input.signal,
  cancelRequests: input.cancelRequests,
});
export const cancelRequests = (state: VendorSessionState): void => {
  for (const request of state.permissions.values())
    state.server.respond(request, { decision: 'cancel' });
  state.permissions.clear();
  for (const request of state.elicitations.splice(0))
    state.server.respond(request, { answers: {} });
};
export const closeSession = async (
  state: VendorSessionState,
): Promise<void> => {
  state.signal.removeEventListener('abort', state.cancelRequests);
  state.cancelRequests();
  await state.server.close();
};
