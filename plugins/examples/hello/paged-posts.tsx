import {
  Action,
  List,
  ListItem,
  Screen,
  Text,
  type Argo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Post } from './paged-posts-data';
import { usePosts, type Posts } from './use-posts';

function postRow(post: Post): JSX.Element {
  return <ListItem key={post.id} id={String(post.id)} title={post.title} />;
}

function PostList(posts: Posts): JSX.Element {
  return (
    <List
      items={posts.posts}
      renderItem={postRow}
      pagination={{ hasMore: posts.hasMore, onLoadMore: posts.more }}
      onRefresh={posts.refresh}
      searchMode="plugin"
      onSearchTextChange={posts.search}
      isLoading={posts.loading}
      empty={<Text>{posts.error || 'No posts'}</Text>}
    />
  );
}

function PostsPage({ fetch }: { fetch: Argo['fetch'] }): JSX.Element {
  const posts = usePosts(fetch);

  return (
    <Screen
      title="Remote posts"
      actions={<Action label="Refresh" icon="retry" onPress={posts.refresh} />}
    >
      <PostList {...posts} />
    </Screen>
  );
}

export function helloPosts(fetch: Argo['fetch']): () => JSX.Element {
  return () => <PostsPage fetch={fetch} />;
}
