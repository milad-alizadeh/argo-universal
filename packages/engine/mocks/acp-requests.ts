import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';

export const acpPermission: RequestPermissionRequest = {
  sessionId: 'session-one',
  toolCall: { toolCallId: 'tool-one', title: 'Read file' },
  options: [
    { optionId: 'read-once', name: 'Read once', kind: 'allow_once' },
    { optionId: 'reject-read', name: 'Reject', kind: 'reject_once' },
  ],
};
