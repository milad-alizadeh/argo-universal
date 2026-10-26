import { createRejectionCounter } from '@repo/machine-log';
import type { z } from 'zod';
import type { HostMessage } from '../protocol/runtime';

const rejections = createRejectionCounter('Plugin host');

// IPC from the Plugin host process is outside data: a message that fails its schema is reported and counted, then dropped.
export function readHostMessage(
  parsed: z.ZodSafeParseResult<HostMessage>,
): HostMessage | undefined {
  if (parsed.success) return parsed.data;
  rejections.report('unrecognised message', parsed.error.issues);

  return undefined;
}
