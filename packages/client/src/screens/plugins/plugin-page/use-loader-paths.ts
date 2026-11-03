import { matchesAnyPagePath } from '@repo/contracts/plugins/page-address';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

/*
 * Whether a Plugin's path is one of its Loader pages, or undefined until the Server says. The patterns
 * change only when the Plugin restarts, so they are asked for once.
 */
export function useIsLoaderPage(
  pluginId: string,
  path: string,
): boolean | undefined {
  const { data, isError } = useLoaderPatterns(pluginId);

  if (isError) return false;

  return data && matchesAnyPagePath(data, path);
}

// The Page path patterns of the Plugin's Loader pages.
export const useLoaderPatterns = (
  pluginId: string,
): { data?: string[]; isError: boolean } =>
  useQuery({
    ...useTRPC().plugins.loaderPages.queryOptions({ pluginId }),
    staleTime: Number.POSITIVE_INFINITY,
  });
