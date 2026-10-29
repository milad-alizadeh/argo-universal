import type {
  OperationExecution,
  OperationRunResponse,
} from '@repo/contracts/operations/control';

type Write = (line: string) => void;

const waitingExitCode = 75;

export function executionExitCode(execution: OperationExecution): number {
  return execution.status === 'settled' ? 0 : waitingExitCode;
}

// Prints a result as JSON, or native work as its execution, and answers the exit code.
export function writeRunResponse(
  write: Write,
  response: OperationRunResponse,
): number {
  if (response.kind === 'result') {
    write(JSON.stringify(response.result, null, 2));

    return 0;
  }

  return writeExecution(write, response);
}

export function writeExecution(
  write: Write,
  execution: OperationExecution,
): number {
  write(JSON.stringify(execution, null, 2));

  return executionExitCode(execution);
}
