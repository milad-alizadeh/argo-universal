import type {
  CanUseTool,
  PermissionResult,
} from '@anthropic-ai/claude-agent-sdk';
import type { Requests } from './request-tracker';
import { cancelledRequestReason } from './request-tracker';
export const toolPermissions =
  (requests: Requests): CanUseTool =>
  (toolName, input, options): Promise<PermissionResult> => {
    if (toolName === 'ExitPlanMode')
      return Promise.resolve({
        behavior: 'deny',
        message: 'Request answers are not implemented yet',
      });
    return requestPermission(requests, { toolName, input, options });
  };
type PermissionInput = {
  toolName: Parameters<CanUseTool>[0];
  input: Parameters<CanUseTool>[1];
  options: Parameters<CanUseTool>[2];
};
function requestPermission(
  requests: Requests,
  input: PermissionInput,
): Promise<PermissionResult> {
  const { options } = input;
  const answer = Promise.withResolvers<PermissionResult>();
  requests.add(permissionMessage(input), answer.resolve);
  const cancel = (): void => cancelPermission(requests, options.toolUseID);
  options.signal.addEventListener('abort', cancel, { once: true });
  if (options.signal.aborted) cancel();
  return answer.promise.finally((): void =>
    options.signal.removeEventListener('abort', cancel),
  );
}
function permissionMessage(
  input: PermissionInput,
): import('./messages').SDKControlRequest {
  return {
    type: 'control_request',
    request_id: input.options.requestId,
    request: permissionRequest(input),
  };
}
function permissionRequest({
  toolName,
  input,
  options,
}: PermissionInput): Extract<
  import('./messages').SDKControlRequest['request'],
  { subtype: 'can_use_tool' }
> {
  return {
    subtype: 'can_use_tool',
    tool_name: toolName,
    input,
    tool_use_id: options.toolUseID,
  };
}
function cancelPermission(requests: Requests, id: string): void {
  requests
    .remove(id)
    ?.resolve({ behavior: 'deny', message: cancelledRequestReason });
}
