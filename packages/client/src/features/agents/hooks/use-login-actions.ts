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
import { loginIdentity, type OwnedLogin } from './login-operation';
import { loginOwner } from './login-owner';

type Input = {
  agentId: string;
  operation?: OwnedLogin;
  setOperation: (operation: OwnedLogin) => void;
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

function useStartLogin(input: Input): {
  begin: () => Promise<void>;
  busy: boolean;
} {
  const mutation = useMutation(useTRPC().agents.startLogin.mutationOptions());
  const begin = async (): Promise<void> => {
    const ownerToken = await loginOwner();
    const snapshot = await mutation.mutateAsync({
      agentId: input.agentId,
      ownerToken,
    });
    input.setOperation({ ownerToken, snapshot });
  };
  return { begin, busy: mutation.isPending };
}

function useSnapshotUpdate(
  input: Input,
): (snapshot: AgentLoginSnapshot) => void {
  const trpc = useTRPC();
  const cache = useQueryClient();
  return (snapshot) => {
    input.clearFailure();
    if (!input.operation) return;
    const operation = { ...input.operation, snapshot };
    input.setOperation(operation);
    const key = trpc.agents.login.queryKey(loginIdentity(operation));
    cache.setQueryData(key, snapshot);
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
  identity: () => ReturnType<typeof loginIdentity>;
  choose: {
    mutate: (
      input: ReturnType<typeof loginIdentity> & { methodId: string },
    ) => void;
    isPending: boolean;
  };
  answer: {
    mutate: (
      input: ReturnType<typeof loginIdentity> & {
        requestId: string;
        action: 'accept' | 'cancel';
      },
    ) => void;
    isPending: boolean;
  };
  cancel: {
    mutate: (input: ReturnType<typeof loginIdentity>) => void;
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

function requireOperation(input: Input): OwnedLogin {
  if (!input.operation) throw new Error('Sign-in has not started');
  return input.operation;
}
const anyPending = (mutations: readonly { isPending: boolean }[]): boolean =>
  mutations.some(({ isPending }) => isPending);

const operationIdentity =
  (input: Input): (() => ReturnType<typeof loginIdentity>) =>
  () =>
    loginIdentity(requireOperation(input));
