import type { ContentBlock as AcpContentBlock } from '@agentclientprotocol/sdk';
import type { ContentBlock } from '@repo/contracts';

export const promptMetadata = (
  metadata: ContentBlock['_meta'],
): AcpContentBlock['_meta'] => metadata?.acp;
