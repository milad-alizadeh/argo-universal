import type { DesktopShare } from '@repo/contracts/desktop-share';
import type { z } from 'zod';
import { reportUnrecognised } from './report-unrecognised';

// A share request from the renderer that fails its schema is reported, then rejected.
export function readShareRequest(
  content: z.ZodSafeParseResult<DesktopShare>,
): DesktopShare {
  if (content.success) return content.data;
  reportUnrecognised('share request', content.error);

  throw content.error;
}
