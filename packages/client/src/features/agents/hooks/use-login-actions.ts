import type {
  AgentLoginAnswer,
  AgentLoginChoose,
  AgentLoginOperation,
  AgentLoginSnapshot,
} from '@repo/contracts';
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useTRPC, type ClientError } from '#features/connection';
import { loginOwner } from './login-owner';

type Input = {
  agentId: string;
  operation?: AgentLoginOperation;
  setOperation: (operation: AgentLoginOperation) => void;
  onError: (error: { message: string }) => void;
  clearFailure: () => void;
};

type Actions = {
  start: () => Promise<void>;
  onChoose: (methodId: string) => void;
  onAnswer: (requestId: string, action: 'accept' | 'cancel') => void;
  onCancel: () => void;
  busy: boolean;
};

export function useLoginActions(input: Input): Actions {
  const start = useStartLogin(input);
  const update = useUpdateLogin(input);

  return { ...update, start: start.begin, busy: start.busy || update.busy };
}

type LoginStart = { begin: () => Promise<void>; busy: boolean };

function useStartLogin(input: Input): LoginStart {
  const mutation = useMutation(useTRPC().agents.startLogin.mutationOptions());
  const store = useStoreSnapshot();

  const begin = async (): Promise<void> => {
    const ownerToken = await loginOwner();

    const snapshot = await mutation.mutateAsync({
      agentId: input.agentId,
      ownerToken,
    });

    const operation = { operationId: snapshot.operationId, ownerToken };
    store(operation, snapshot);
    input.setOperation(operation);
  };

  return { begin, busy: mutation.isPending };
}

type StoreSnapshot = (
  operation: AgentLoginOperation,
  snapshot: AgentLoginSnapshot,
) => void;

// The query cache is the one home of a sign-in's snapshot; state keeps only its operation.
function useStoreSnapshot(): StoreSnapshot {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return (operation, snapshot) => {
    cache.setQueryData(trpc.agents.login.queryKey(operation), snapshot);
  };
}

function useSnapshotUpdate(
  input: Input,
): (snapshot: AgentLoginSnapshot) => void {
  const store = useStoreSnapshot();

  return (snapshot) => {
    input.clearFailure();

    if (input.operation) store(input.operation, snapshot);
  };
}

function useUpdateLogin(input: Input): Omit<Actions, 'start'> {
  const mutations = useLoginMutations(useSnapshotUpdate(input), input.onError);

  return updateCallbacks({ identity: operationIdentity(input), ...mutations });
}

type LoginMutations = {
  choose: UseMutationResult<AgentLoginSnapshot, ClientError, AgentLoginChoose>;
  answer: UseMutationResult<AgentLoginSnapshot, ClientError, AgentLoginAnswer>;
  cancel: UseMutationResult<
    AgentLoginSnapshot,
    ClientError,
    AgentLoginOperation
  >;
};

function useLoginMutations(
  onSuccess: (snapshot: AgentLoginSnapshot) => void,
  onError: Input['onError'],
): LoginMutations {
  const trpc = useTRPC();
  const options = { onSuccess, onError };

  return {
    choose: useMutation(trpc.agents.chooseLoginMethod.mutationOptions(options)),
    answer: useMutation(trpc.agents.answerLogin.mutationOptions(options)),
    cancel: useMutation(trpc.agents.cancelLogin.mutationOptions(options)),
  };
}

type UpdateMutations = {
  identity: () => AgentLoginOperation;
  choose: {
    mutate: (input: AgentLoginOperation & { methodId: string }) => void;
    isPending: boolean;
  };
  answer: {
    mutate: (
      input: AgentLoginOperation & {
        requestId: string;
        action: 'accept' | 'cancel';
      },
    ) => void;
    isPending: boolean;
  };
  cancel: {
    mutate: (input: AgentLoginOperation) => void;
    isPending: boolean;
  };
};

function updateCallbacks({
  identity,
  choose,
  answer,
  cancel,
}: UpdateMutations): Omit<Actions, 'start'> {
  return {
    onChoose: (methodId) => choose.mutate({ ...identity(), methodId }),
    onAnswer: (requestId, action) =>
      answer.mutate({ ...identity(), requestId, action }),
    onCancel: () => cancel.mutate(identity()),
    busy: anyPending([choose, answer, cancel]),
  };
}

function requireOperation(input: Input): AgentLoginOperation {
  if (!input.operation) throw new Error('Sign-in has not started');

  return input.operation;
}

const anyPending = (mutations: readonly { isPending: boolean }[]): boolean =>
  mutations.some(({ isPending }) => isPending);

const operationIdentity =
  (input: Input): (() => AgentLoginOperation) =>
  () =>
    requireOperation(input);
