import {
  OperationExecution,
  OperationRow,
  OperationRunResponse,
  type OperationRunRequest,
} from '@repo/contracts/operations/control';
import { z } from 'zod';
import { connectControl } from './control-connection';
import { readControlResponse } from './control-response';

// Leave transport overhead beyond the Engine's ninety-second observation cap.
const waitRequestTimeoutMs = 100_000;

export type RunRequest = OperationRunRequest;

// The Server's control procedures, answered complete and checked against their envelopes; results stay JSON.
export type ControlClient = {
  list: (filter: string | undefined) => Promise<OperationRow[]>;
  run: (request: RunRequest) => Promise<OperationRunResponse>;
  wait: (id: string, timeoutMs?: number) => Promise<OperationExecution>;
};

// What a control command reads and writes: standard output and the Server's control procedures.
export type CommandIo = {
  write: (line: string) => void;
  client: ControlClient;
};

const listOperations = async (
  filter: string | undefined,
): Promise<OperationRow[]> =>
  readControlResponse(
    z.array(OperationRow),
    await (await connectControl()).operations.list.query({ filter }),
  );

const runOperation = async (
  request: RunRequest,
): Promise<OperationRunResponse> => {
  const control = await connectControl(waitRequestTimeoutMs);

  return readControlResponse(
    OperationRunResponse,
    await control.operations.run.mutate(request),
  );
};

const waitOperation = async (
  id: string,
  timeoutMs?: number,
): Promise<OperationExecution> => {
  const control = await connectControl(waitRequestTimeoutMs);

  return readControlResponse(
    OperationExecution,
    await control.operations.wait.mutate({ id, timeoutMs }),
  );
};

// Finds the Server and reads the token only when a command first calls it, so a usage error needs no Server.
export const createControlClient = (): ControlClient => ({
  list: listOperations,
  run: runOperation,
  wait: waitOperation,
});
