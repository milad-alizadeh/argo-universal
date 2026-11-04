import { kitComponent } from '@repo/contracts/plugins/kit';
import type { PageRunAnswer } from '@repo/contracts/plugins/page-address';
import {
  PageCalls,
  type PageEvent,
  type ScopedRun,
} from '@repo/contracts/plugins/page-calls';
import type { DrawRequest } from '@repo/contracts/plugins/page-draw';
import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import { expect, it, onTestFinished } from 'vitest';
import {
  cacheOverMemory,
  issues,
  kept,
  onScreen,
  settled,
} from './page-addresses-fixtures';
import { pageCallsPorts } from './page-calls-ports';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({ type, key, props, children: [], slots: {} });

// A draft field whose typing is Page state, and a Create button that takes the draft and shows it is creating.
function draftPage({ pageState }: DrawRequest): WireNode {
  const draft = String(pageState.draft ?? '');

  const create = node('Button', 'create', {
    label: 'Create',
    onPress: {
      operation: 'create',
      args: { title: draft },
      optimistic: [{ key: 'create', props: { label: 'Creating' } }],
    },
  });

  const field = node('FieldGroup.TextField', 'draft', {
    label: 'Title',
    value: draft,
    onChangeText: { pageState: { draft: { $payload: true } } },
  });

  return { ...node('Stack', 'page', {}), children: [field, create] };
}

const keyOf = (key: string): string =>
  childNodeKey(childNodeKey('', 'page'), key);

const schemaOf = (type: string, name: string): PageEvent['schema'] => {
  const schema = kitComponent(type)?.events[name];

  if (!schema) throw new Error(`${type} has no ${name}`);

  return schema;
};

const labelOf = (root: WireNode | undefined): WireJson | undefined =>
  root?.children[1]?.props.label;

it('lands the typing through the Page address cache before a press runs, for the page’s Project, patching only its own tree', async () => {
  const cache = cacheOverMemory();
  const runs: (ScopedRun & { pluginId: string })[] = [];
  const answer = Promise.withResolvers<PageRunAnswer>();

  cache.server.tree = draftPage;

  const screen = onScreen(cache, issues);
  const other = onScreen(cache, { ...issues, projectId: 'site' });

  const calls = new PageCalls(
    pageCallsPorts(cache.addresses, issues, {
      run: (run) => {
        runs.push(run);

        return answer.promise;
      },
      failed: (error) => {
        throw error;
      },
    }),
  );

  onTestFinished(() => {
    calls.close();
    screen.leave();
    other.leave();
  });
  await settled();

  await calls.call(
    { pageState: { draft: 'fix login' } },
    {
      key: keyOf('draft'),
      name: 'onChangeText',
      schema: schemaOf('FieldGroup.TextField', 'onChangeText'),
      payload: 'fix login',
    },
  );

  const pressed = calls.call(
    { operation: 'create', args: { title: '' } },
    {
      key: keyOf('create'),
      name: 'onPress',
      schema: schemaOf('Button', 'onPress'),
    },
  );

  await settled();

  expect(runs).toEqual([
    {
      pluginId: 'tracker',
      operation: 'create',
      args: { title: 'fix login' },
      projectId: 'argo',
    },
  ]);
  expect(labelOf(cache.addresses.shown(issues))).toBe('Creating');
  expect(labelOf(kept(other.answer()).root)).toBe('Create');

  answer.resolve({ result: null });
  await pressed;
});
