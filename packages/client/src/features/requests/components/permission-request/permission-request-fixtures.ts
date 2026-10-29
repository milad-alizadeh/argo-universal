import { permissionOptions } from '@repo/contracts';
import {
  agentOptionsProps,
  agentOptionsWithAlwaysReject,
  permissionProps,
} from '../request.mocks';
import type { PermissionRequestProps } from './permission-request';

// A story supplies the callbacks; a fixture is the request, what it would run and how it stands.
type PermissionRequestFixture = Omit<
  PermissionRequestProps,
  'onAnswer' | 'onBuildInNewSession' | 'onSavePlan'
>;

// The reason the Server gives when the request was answered somewhere else.
const answeredElsewhere = 'Already answered on another device';

const recorded = permissionProps({});

// The recorded request to run a Tool call: its title, the Agent's reason and the input it sent.
export const toolCallPermission = {
  request: recorded.request,
  input: recorded.input,
  reason: recorded.reason,
  state: { kind: 'open' },
} satisfies PermissionRequestFixture;

// The Agent offers two allow options, so the allow group leads with Allow once and takes a chevron.
export const severalAllowOptionsPermission = {
  ...toolCallPermission,
  request: agentOptionsProps({}).request,
} satisfies PermissionRequestFixture;

// The Agent offers two of each, so both groups take a chevron.
export const severalRejectOptionsPermission = {
  ...toolCallPermission,
  request: agentOptionsProps({ options: agentOptionsWithAlwaysReject }).request,
} satisfies PermissionRequestFixture;

// Answered on another device: the actions go quiet and the card says why.
export const answeredPermission = {
  ...toolCallPermission,
  state: { kind: 'answered', reason: answeredElsewhere },
} satisfies PermissionRequestFixture;

// Argo asks on the same Composer card before an Operation leaves the Agent's reach.
export const argoPermission = {
  request: {
    requestId: 'argo-request',
    toolCallId: 'argo-call',
    title: 'Archive Session',
    operation: {
      id: 'session.archive',
      description:
        'Archive an idle Session and remove its Checkout after the Undo window.',
      input: '{"sessionId":"review-session"}',
    },
    options: permissionOptions,
  },
  state: { kind: 'open' },
} satisfies PermissionRequestFixture;
