import type { OperationExecution } from '@repo/contracts/operations';

export type WorkObservation = {
  execution: OperationExecution;
  sessionId: string;
  started: boolean;
};
