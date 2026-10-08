import type { z } from 'zod';
import { sessionColumns } from '../columns';

// The stored Session, shared by the Server's projections (ADR-0013).
export const SessionRecord = sessionColumns;
export type SessionRecord = z.infer<typeof SessionRecord>;
