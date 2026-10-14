import { createRejectionCounter } from '@repo/machine-log';
import type { z } from 'zod';

const rejections = createRejectionCounter('desktop');

// Outside data that fails its schema is rejected, then reported here with a running count.
export function reportUnrecognised(source: string, error: z.ZodError): void {
  rejections.report(`unrecognised ${source}`, error.issues);
}
