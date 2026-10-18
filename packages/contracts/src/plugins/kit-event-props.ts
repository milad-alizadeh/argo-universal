import { z } from 'zod';
import { Action, WireEvent } from './wire';

export const pressHandler = z
  .union([WireEvent.extend({ $event: z.literal('onPress') }), Action])
  .describe('A Plugin event handler or an App action.');
