import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

// Where a new Project comes from: a folder on the Server, or a repository to clone.
export type ProjectSource = 'folder' | 'clone';

export interface AddProject {
  adding: boolean;
  error?: string;
  add: (source: ProjectSource, value: string) => void;
}

interface AddedHandlers {
  onSuccess: () => void;
}

// Refreshes the Projects list once the Server has added one, then tells the caller.
function useAdded(onAdded: () => void): AddedHandlers {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return {
    onSuccess: (): void => {
      void cache.invalidateQueries(trpc.project.list.queryFilter());
      onAdded();
    },
  };
}

// Adds a Project on the Server and tells the caller once it is there.
export function useAddProject(onAdded: () => void): AddProject {
  const trpc = useTRPC();
  const options = useAdded(onAdded);
  const folder = useMutation(trpc.project.add.mutationOptions(options));
  const clone = useMutation(trpc.project.clone.mutationOptions(options));

  return {
    ...projectStatus(folder, clone),
    add: (source, value) => {
      folder.reset();
      clone.reset();

      if (source === 'folder') folder.mutate({ path: value });
      else clone.mutate({ url: value });
    },
  };
}

interface MutationStatus {
  isPending: boolean;
  error: { message: string } | null;
}

function projectStatus(
  folder: MutationStatus,
  clone: MutationStatus,
): Pick<AddProject, 'adding' | 'error'> {
  return {
    adding: folder.isPending || clone.isPending,
    error: mutationError(folder) ?? mutationError(clone),
  };
}

const mutationError = (mutation: MutationStatus): string | undefined =>
  mutation.error?.message;
