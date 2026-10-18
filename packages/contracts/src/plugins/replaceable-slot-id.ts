import { z } from 'zod';

export const toolCallSlotId = 'argo/feed/tool-call/v1';

export const messageSlotId = 'argo/feed/message/v1';

export const composerAboveSlotId = 'argo/composer/above/v1';

export const ReplaceableSlotId = z.enum([
  toolCallSlotId,
  messageSlotId,
  composerAboveSlotId,
]);
