import { z } from 'zod';

export const DesktopShare = z.strictObject({
  message: z.string(),
  title: z.string().optional(),
  url: z.url({ protocol: /^https?$/u }).optional(),
});

export type DesktopShare = z.infer<typeof DesktopShare>;
