import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { SessionUpdateKind } from '@repo/contracts';

export const createScopedFeedRowId = (identity: {
  acpSessionId: SessionNotification['sessionId'];
  kind: SessionUpdateKind;
  upstreamId?: string;
  localPosition?: number;
}): string =>
  JSON.stringify([
    identity.kind,
    identity.acpSessionId,
    identity.upstreamId === undefined
      ? ['local', identity.localPosition]
      : ['upstream', identity.upstreamId],
  ]);
