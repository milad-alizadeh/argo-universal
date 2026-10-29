import { z } from 'zod';

const observedError = z
  .instanceof(Error)
  .catch(new Error('Unrecognised Server-wire error'));

export const runtimeError = (cause: unknown): Error =>
  observedError.parse(cause);
