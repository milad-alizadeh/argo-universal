import type { Argo } from '@argo/plugin-kit';

export interface Post {
  id: number;
  title: string;
}

export const pageSize = 30;

const firstErrorStatus = 400;

function isRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function hasId(value: unknown): value is Pick<Post, 'id'> {
  if (!isRecord(value)) return false;

  return 'id' in value && typeof value.id === 'number';
}

function hasTitle(value: unknown): value is Pick<Post, 'title'> {
  if (!isRecord(value)) return false;

  return 'title' in value && typeof value.title === 'string';
}

function isPost(value: unknown): value is Post {
  if (!isRecord(value)) return false;

  return hasId(value) && hasTitle(value);
}

function isPosts(value: unknown): value is Post[] {
  return Array.isArray(value) && value.every(isPost);
}

type PostResponse = NonNullable<Awaited<ReturnType<Argo['fetch']>>>;

function checkedResponse(response: PostResponse): PostResponse {
  if (response.status >= firstErrorStatus)
    throw new Error(`Loading posts failed (${response.status})`);

  return response;
}

async function loadPosts(
  fetch: Argo['fetch'],
  page: number,
  query: string,
): Promise<Post[]> {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts?_limit=${pageSize}&_page=${page}&title_like=${encodeURIComponent(query)}`,
  );

  if (!response) throw new Error('Remote list returned no response');

  const value = await checkedResponse(response).json();

  if (isPosts(value)) return value;
  throw new Error('Invalid remote posts page');
}

// A new search or refresh makes an older page's reply irrelevant.
export class RemotePosts {
  private generation = 0;
  private refreshing = false;
  public constructor(private readonly fetch: Argo['fetch']) {}

  public invalidate(): void {
    this.generation++;
  }

  public async refresh(query: string): Promise<Post[] | undefined> {
    this.invalidate();
    this.refreshing = true;
    const own = this.generation;

    try {
      return await this.read(1, query);
    } finally {
      if (own === this.generation) this.refreshing = false;
    }
  }

  public async more(page: number, query: string): Promise<Post[] | undefined> {
    if (this.refreshing) return;

    return this.read(page, query);
  }

  private async read(page: number, query: string): Promise<Post[] | undefined> {
    const own = this.generation;
    const next = await loadPosts(this.fetch, page, query);

    return own === this.generation ? next : undefined;
  }
}
