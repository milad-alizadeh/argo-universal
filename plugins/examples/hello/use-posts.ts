import { useCallback, useEffect, useState, type Argo } from '@argo/plugin-kit';
import { RemotePosts, pageSize, type Post } from './paged-posts-data';

interface PostPage {
  posts: Post[];
  nextPage: number;
  hasMore: boolean;
  error: string;
  loading: boolean;
}

export interface Posts extends PostPage {
  refresh: () => Promise<void>;
  more: () => Promise<void>;
  search: (query: string) => void;
}

type SetPage = (page: PostPage | ((current: PostPage) => PostPage)) => void;

const initial: PostPage = {
  posts: [],
  nextPage: 1,
  hasMore: false,
  error: '',
  loading: true,
};

async function refreshPage(
  remote: RemotePosts,
  query: string,
  set: SetPage,
): Promise<void> {
  const posts = await remote.refresh(query);

  if (posts)
    set({
      posts,
      nextPage: 2,
      hasMore: posts.length === pageSize,
      error: '',
      loading: false,
    });
}

function appended(current: PostPage, posts: Post[]): PostPage {
  const combined = [
    ...new Map(
      [...current.posts, ...posts].map((post) => [post.id, post]),
    ).values(),
  ];

  return {
    ...current,
    posts: combined,
    nextPage: current.nextPage + 1,
    hasMore: posts.length === pageSize,
  };
}

async function loadPage(
  remote: RemotePosts,
  input: { state: PostPage; query: string },
  set: SetPage,
): Promise<void> {
  const posts = await remote.more(input.state.nextPage, input.query);

  if (posts) set((current) => appended(current, posts));
}

function useInitialRefresh(
  refresh: Posts['refresh'],
  remote: RemotePosts,
  set: SetPage,
): void {
  useEffect(() => startRefresh(refresh, remote, set), [refresh, remote, set]);
}

export function usePosts(fetch: Argo['fetch']): Posts {
  const [remote] = useState(() => new RemotePosts(fetch));
  const [state, set] = useState(initial);
  const [query, search] = useState('');

  const refresh = useCallback(
    () => refreshPage(remote, query, set),
    [remote, query],
  );

  const more = useCallback(
    () => loadPage(remote, { state, query }, set),
    [remote, state, query],
  );

  useInitialRefresh(refresh, remote, set);

  return { ...state, refresh, more, search };
}

function startRefresh(
  refresh: Posts['refresh'],
  remote: RemotePosts,
  set: SetPage,
): () => void {
  const scope = { active: true, set };
  void refresh().catch((cause: unknown) => refreshFailed(scope, cause));

  return () => {
    scope.active = false;
    remote.invalidate();
  };
}

function refreshFailed(
  scope: { active: boolean; set: SetPage },
  cause: unknown,
): void {
  if (scope.active)
    scope.set((current) => ({
      ...current,
      error: String(cause),
      loading: false,
    }));
}
