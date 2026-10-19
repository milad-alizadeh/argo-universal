import type {
  CreateElicitationResponse,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';

// The answer to a Permission request nobody answers: the request was withdrawn, or no Agent session takes it.
export const cancelledPermission: RequestPermissionResponse = {
  outcome: { outcome: 'cancelled' },
};

// The answer to an Elicitation nobody answers.
export const cancelledElicitation: CreateElicitationResponse = {
  action: 'cancel',
};
