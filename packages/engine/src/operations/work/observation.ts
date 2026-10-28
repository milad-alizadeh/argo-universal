import type { OperationExecution } from '@repo/contracts/operations';
import type { SessionWork } from '../../sessions';

// An execution read from the work it describes, which is the native work once a Tool call has started one.
export type WorkObservation = {
  execution: OperationExecution;
  work: SessionWork;
};
