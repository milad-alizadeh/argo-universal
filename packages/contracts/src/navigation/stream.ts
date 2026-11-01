import { z } from 'zod';
import { ScreenDestination } from './screen-link';

// What the Server sends a desktop App Connection: that it is listening, then each destination to open.
export const NavigationStreamEvent = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready'), serverId: z.string().min(1) }),
  z.strictObject({ type: z.literal('open'), destination: ScreenDestination }),
]);

export type NavigationStreamEvent = z.infer<typeof NavigationStreamEvent>;
