import type {
  PluginDataRequest,
  PluginDataState,
  PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import { PluginViewId } from '@repo/contracts/plugins/wire';
import { createElement } from 'react';
import { expect, it } from 'vitest';
import { PluginDataClient } from './data-client';
import { mount } from './reconciler';
import { QueryViewContext, useQueryData } from './use-data';

const viewId = PluginViewId.parse('view');

const issues = 'https://example.com/issues';

const answered: PluginDataState = { stale: false, revision: 1 };

type Drawn = {
  watched: PluginDataRequest[];
  failures: Error[];
  error: string | undefined;
};

// Draws one Plugin page whose only component asks for `query`, and reports what that page got.
async function drawn(query: PluginQuery): Promise<Drawn> {
  const watched: PluginDataRequest[] = [];
  const failures: Error[] = [];
  const asked: (string | undefined)[] = [];
  // React commits a concurrent root on its own scheduler, so the page is awaited rather than timed.
  const drawing = Promise.withResolvers<void>();

  const client = new PluginDataClient((request) => {
    watched.push(request);

    return Promise.resolve(answered);
  });

  const Page = (): null => {
    asked.push(useQueryData(client, query).error);

    return null;
  };

  mount(
    createElement(
      QueryViewContext.Provider,
      { value: viewId },
      createElement(Page),
    ),
    () => drawing.resolve(),
    (failure) => {
      failures.push(failure);
      drawing.resolve();
    },
  );
  await drawing.promise;

  return { watched, failures, error: asked.at(-1) };
}

const queriesWatched = ({ watched }: Drawn): PluginQuery[] =>
  watched
    .filter((request) => request.action === 'watch')
    .map((request) => request.query);

it('watches a Query whose optional field is left undefined as one that omits it', async () => {
  const omitted = queriesWatched(await drawn({ api: 'fetch', url: issues }));

  expect(omitted).toEqual([{ api: 'fetch', url: issues }]);
  expect(
    queriesWatched(
      await drawn({ api: 'fetch', url: issues, headers: undefined }),
    ),
  ).toEqual(omitted);
});

it('reports a Query it cannot normalise as an error rather than failing the page', async () => {
  const page = await drawn({
    api: 'fetch',
    url: issues,
    headers: {
      'Content-Type': 'application/json',
      'content-type': 'text/plain',
    },
  });

  expect(page.error).toContain('names the content-type header more than once');
  expect(page.failures).toEqual([]);
  expect(page.watched).toEqual([]);
});
