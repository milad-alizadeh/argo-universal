import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

// Where a new Project comes from: a folder on the Server, a repository to clone, or a name to start from.
export type ProjectSource = 'folder' | 'clone' | 'new';

export interface AddProject {
  adding: boolean;
  add: (source: ProjectSource, value: string) => void;
}

interface AddedHandlers {
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
}

const failed = (error: { message: string }): void =>
  showToast({
    title: 'Could not add the Project',
    message: error.message,
    tone: 'danger',
  });

// Refreshes the Projects list once the Server has added one, then tells the caller.
function useAdded(onAdded: () => void): AddedHandlers {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return {
    onSuccess: (): void => {
      void cache.invalidateQueries(trpc.project.list.queryFilter());
      onAdded();
    },
    onError: failed,
  };
}

// Adds a Project on the Server and tells the caller once it is there.
export function useAddProject(onAdded: () => void): AddProject {
  const trpc = useTRPC();
  const options = useAdded(onAdded);
  const folder = useMutation(trpc.project.add.mutationOptions(options));
  const clone = useMutation(trpc.project.clone.mutationOptions(options));
  const created = useMutation(trpc.project.create.mutationOptions(options));

  return {
    adding: folder.isPending || clone.isPending || created.isPending,
    add: (source, value) => {
      if (source === 'folder') folder.mutate({ path: value });
      else if (source === 'clone') clone.mutate({ url: value });
      else created.mutate({ name: value });
    },
  };
}
