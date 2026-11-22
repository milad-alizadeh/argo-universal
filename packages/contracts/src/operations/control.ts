// The CLI reads JSON from the Server’s control procedures without loading the Operation registry (ADR-0044).
export {
  OperationExecution,
  OperationRunResponse,
  OperationWaitId,
} from './execution';

export { OperationInputRow, OperationRow } from './metadata';

export {
  OperationRunRequest,
  OperationWaitRequest,
  operationWaitLimitMs,
} from './control-input';

export { PluginInstruction } from './plugin-instructions';

export { agentImageResult } from './agent-image-result';
