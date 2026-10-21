import type { PermissionRequestProps } from '../permission-request/permission-request';
import { planRequest } from './plan-request.mocks';

// A story supplies the callbacks; a fixture is the request to leave plan mode and how it stands.
type PlanRequestFixture = Omit<
  PermissionRequestProps,
  'onAnswer' | 'onBuildInNewSession' | 'onSavePlan'
>;

// claude-agent-acp's request to leave plan mode, as the Engine presents it.
export const openPlan = {
  request: planRequest,
  state: { kind: 'open' },
} satisfies PlanRequestFixture;

// The answer is on its way to the Agent, so the actions wait.
export const sendingPlan = {
  ...openPlan,
  state: { kind: 'submitting' },
} satisfies PlanRequestFixture;
