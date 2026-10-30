// What the CLI reads from the Server's two control procedures, without the Operation registry: it treats every result as JSON (ADR-0044).
export {
  OperationExecution,
  OperationRunResponse,
  OperationWaitId,
} from './execution';

export { OperationRow } from './metadata';

export {
  OperationRunRequest,
  OperationWaitRequest,
  operationWaitLimitMs,
} from './control-input';
