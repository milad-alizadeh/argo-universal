import type {
  OperationExecution,
  OperationRow,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { z } from 'zod';
import type { OperationResult } from './implementations';

// What an Operation answers or records: its own result, the Operations it listed, or the work it started.
type OperationOutput = OperationResult | OperationRow[] | OperationExecution;

// As the wire carries it: a parsed or live value may hold `undefined` fields, which JSON leaves out.
export const wireJson = (value: OperationOutput): Json =>
  z.json().parse(JSON.parse(JSON.stringify(value)));
