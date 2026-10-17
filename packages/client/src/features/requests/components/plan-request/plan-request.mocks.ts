import type { PendingPermission } from '@repo/contracts';
import {
  leavePlanMode,
  leavePlanModeOptions,
  writtenPlan,
} from '@repo/mocks/agent/plan-mode-scenario';
import type { PermissionRequestProps } from '../permission-request/permission-request';

// claude-agent-acp's request to leave plan mode, as the Engine presents it.
const planRequest: PendingPermission = {
  requestId: 'leave-plan-mode-request',
  toolCallId: leavePlanMode.toolCallId,
  title: leavePlanMode.title,
  plan: writtenPlan,
  options: leavePlanModeOptions,
};

export function planRequestProps(
  props: Partial<PermissionRequestProps> = {},
): PermissionRequestProps {
  return {
    request: planRequest,
    onAnswer: () => {},
    onBuildInNewSession: () => {},
    onSavePlan: () => {},
    state: { kind: 'open' },
    ...props,
  };
}

export const planTitleText = 'Fix the README typo';
