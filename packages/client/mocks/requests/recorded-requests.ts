import type { PendingElicitation, PendingPermission } from '@repo/contracts';
import { type RequestMock, recordedRequestMocks } from '@repo/mocks/app';

export const permissionMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'permission',
);
export const elicitationMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'elicitation',
);

const recordingOrder = 'agent-1,agent-2';

function firstRecording(mocks: RequestMock[]): RequestMock {
  const [mock] = mocks;
  const agents = mocks.slice(0, 2).map((recorded) => recorded.agent);
  if (!mock || agents.join() !== recordingOrder)
    throw new Error('Recorded catalog needs both Agents in recording order.');
  return mock;
}
export const permissionMock = firstRecording(permissionMocks);
export const elicitationMock = firstRecording(elicitationMocks);

export function recordedPermission(mock: RequestMock): PendingPermission {
  const request = mock.pending.snapshot.pendingPermission;
  if (!request) throw new Error('Recording needs a Permission request.');
  return request;
}

export function recordedElicitation(mock: RequestMock): PendingElicitation {
  const request = mock.pending.snapshot.pendingElicitation;
  if (!request) throw new Error('Recording needs an Elicitation.');
  return request;
}

export const elicitationRequest = recordedElicitation(elicitationMock);
