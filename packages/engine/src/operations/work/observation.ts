import type { SessionWork } from '../../sessions';
import type { WorkExecution } from './execution';

// An execution read from the work it describes, which is the native work once a Tool call has started one.
export type WorkObservation = {
  execution: WorkExecution;
  work: SessionWork;
};
