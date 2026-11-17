import type {
  AgentSuggestionModel,
  SuggestionModelChoice,
} from '@repo/contracts';
import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

type Choose = (id: string, choice: SuggestionModelChoice) => void;

export interface SuggestionModels {
  // Undefined until the Server has answered.
  agents: AgentSuggestionModel[] | undefined;
  choose: Choose;
}

// Each Installed Agent's model for Follow-up suggestions, chosen on the Server.
export function useSuggestionModels(): SuggestionModels {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.agent.getSuggestionModels.queryOptions());

  return { agents: data, choose: useChooseSuggestionModel() };
}

// Saves a choice and refetches the list; a failure shows one toast.
function useChooseSuggestionModel(): Choose {
  const trpc = useTRPC();
  const cache = useQueryClient();

  const change = useMutation(
    trpc.agent.setSuggestionModel.mutationOptions({
      onSuccess: () =>
        cache.invalidateQueries(trpc.agent.getSuggestionModels.queryFilter()),
    }),
  );

  useErrorToast(
    errorToast('Could not save the suggestion model', change.error),
  );

  return (id, choice) => change.mutate({ id, choice });
}
