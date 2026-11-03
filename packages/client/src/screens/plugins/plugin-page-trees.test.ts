import type { PluginViewInput, WireNode } from '@repo/contracts/plugins/wire';
import {
  QueryObserver,
  skipToken,
  type QueryClient,
} from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../query-cache';
import {
  dropPluginTrees,
  dropTreesOfPluginsOtherThan,
  keepPluginTree,
  keptTreeKey,
} from './plugin-page-trees';

const tree = (title: string): WireNode => ({
  type: 'Text',
  key: 'page',
  props: { title },
  children: [],
  slots: {},
});

const hour = 3_600_000;

const issues = { pluginId: 'issues', path: '/open' };

const issuesOther = { pluginId: 'issues', path: '/closed' };

const atlas = { pluginId: 'atlas', path: '/open' };

const readKeptTree = (
  client: QueryClient,
  page: PluginViewInput,
): WireNode | undefined => client.getQueryData(keptTreeKey(page));

const watchIssues = (client: QueryClient): QueryObserver<WireNode> =>
  new QueryObserver<WireNode>(client, {
    queryKey: keptTreeKey(issues),
    queryFn: skipToken,
  });

describe('a Plugin page tree kept in the App', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    client = createQueryClient();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is kept per Plugin, path and context', () => {
    const forSession = { ...issues, sessionId: 'session-1' };

    keepPluginTree(client, issues, tree('open'));
    keepPluginTree(client, issuesOther, tree('closed'));
    keepPluginTree(client, atlas, tree('atlas'));
    keepPluginTree(client, forSession, tree('for a Session'));

    expect(readKeptTree(client, issues)).toEqual(tree('open'));
    expect(readKeptTree(client, issuesOther)).toEqual(tree('closed'));
    expect(readKeptTree(client, atlas)).toEqual(tree('atlas'));
    expect(readKeptTree(client, forSession)).toEqual(tree('for a Session'));
    expect(
      readKeptTree(client, { ...issues, projectId: 'project-1' }),
    ).toBeUndefined();
  });

  it('stays long after the page that drew it has gone', () => {
    const observer = watchIssues(client);
    const unsubscribe = observer.subscribe(() => {});

    keepPluginTree(client, issues, tree('open'));
    keepPluginTree(client, atlas, tree('never watched'));
    unsubscribe();
    vi.advanceTimersByTime(hour);

    expect(readKeptTree(client, issues)).toEqual(tree('open'));
    expect(readKeptTree(client, atlas)).toEqual(tree('never watched'));
  });

  it('dropping a Plugin leaves the other Plugins kept', async () => {
    keepPluginTree(client, issues, tree('open'));
    keepPluginTree(client, issuesOther, tree('closed'));
    keepPluginTree(client, atlas, tree('atlas'));

    await dropPluginTrees(client, 'issues');

    expect(readKeptTree(client, issues)).toBeUndefined();
    expect(readKeptTree(client, issuesOther)).toBeUndefined();
    expect(readKeptTree(client, atlas)).toEqual(tree('atlas'));
  });

  it('dropping with no Plugin drops every tree, and nothing else', async () => {
    client.setQueryData(['projects', 'list'], ['kept']);
    keepPluginTree(client, issues, tree('open'));
    keepPluginTree(client, atlas, tree('atlas'));

    await dropPluginTrees(client);

    expect(readKeptTree(client, issues)).toBeUndefined();
    expect(readKeptTree(client, atlas)).toBeUndefined();
    expect(client.getQueryData(['projects', 'list'])).toEqual(['kept']);
  });

  it('a page drawing a tree that is dropped hears of it', async () => {
    const observer = watchIssues(client);
    const drawn: (WireNode | undefined)[] = [];

    const unsubscribe = observer.subscribe((result) => {
      drawn.push(result.data);
    });

    keepPluginTree(client, issues, tree('open'));
    await vi.runAllTimersAsync();
    expect(drawn.at(-1)).toEqual(tree('open'));

    const dropping = dropPluginTrees(client, 'issues');
    await vi.runAllTimersAsync();
    await dropping;

    expect(drawn.at(-1)).toBeUndefined();
    unsubscribe();
  });

  it('a Plugin no longer listed loses its trees', async () => {
    keepPluginTree(client, issues, tree('open'));
    keepPluginTree(client, atlas, tree('atlas'));

    await dropTreesOfPluginsOtherThan(client, new Set(['atlas']));

    expect(readKeptTree(client, issues)).toBeUndefined();
    expect(readKeptTree(client, atlas)).toEqual(tree('atlas'));
  });
});
