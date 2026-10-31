import { z } from 'zod';

// Whether the Server keeps running after the desktop app that started it quits. Server Device only (ADR-0022).
export const KeepRunning = z.strictObject({ enabled: z.boolean() });

export type KeepRunning = z.infer<typeof KeepRunning>;
