import type { z } from 'zod';

let unrecognisedShapes = 0;

// Outside data that fails its schema is rejected, then reported here with a running count.
export function reportUnrecognised(source: string, error: z.ZodError): void {
  unrecognisedShapes += 1;
  console.error(
    `desktop: unrecognised ${source} #${unrecognisedShapes}`,
    error.issues,
  );
}
