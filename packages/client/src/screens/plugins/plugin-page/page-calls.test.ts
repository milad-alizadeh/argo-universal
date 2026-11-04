import { kitComponent } from '@repo/contracts/plugins/kit';
import type { MadeOperationCall } from '@repo/contracts/plugins/page-call-payload';
import type { DrawRequest } from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import { expect, it, onTestFinished } from 'vitest';
import type { PageEvent } from '../../../lib/product/plugin-registry';
import {
  cacheOverMemory,
  issues,
  onScreen,
  settled,
  type Cache,
} from './page-addresses-fixtures';
import { PageCalls } from './page-calls';

const node = (
  type: string,
  key: string,
  props: WireNode['props'] = {},
  children: WireNode[] = [],
): WireNode => ({ type, key, props, children, slots: {} });

/*
 * A draft field whose typing is Page state, and a Create button whose Operation takes the draft the page
 * drew; with nothing drafted the button is not drawn.
 */
function draftPage({ pageState }: DrawRequest): WireNode {
  const draft = String(pageState.draft ?? '');

  const create = node('Button', 'create', {
    label: 'Create',
    onPress: { operation: 'create', args: { title: draft } },
  });

  return node('Stack', 'page', {}, [
    node('FieldGroup.TextField', 'draft', {
      label: 'Title',
      value: draft,
      onChangeText: { pageState: { draft: { $payload: true } } },
    }),
    ...(draft === 'gone' ? [] : [create]),
  ]);
}

const keyOf = (key: string): string =>
  childNodeKey(childNodeKey('', 'page'), key);

function schemaOf(type: string, name: string): PageEvent['schema'] {
  const schema = kitComponent(type)?.events[name];

  if (!schema) throw new Error(`${type} has no ${name}`);

  return schema;
}

type Page = {
  cache: Cache;
  calls: PageCalls;
  runs: MadeOperationCall[];
  type: (text: string) => Promise<void>;
  press: () => Promise<void>;
};

async function drafting(): Promise<Page> {
  const cache = cacheOverMemory();
  const runs: MadeOperationCall[] = [];

  cache.server.tree = draftPage;

  const screen = onScreen(cache, issues);
  const calls = new PageCalls({
    addresses: cache.addresses,
    opening: issues,
    run: (call) => {
      runs.push(call);

      return Promise.resolve();
    },
  });

  onTestFinished(() => {
    calls.close();
    screen.leave();
  });
  await settled();

  const typed = { key: keyOf('draft'), name: 'onChangeText' };
  const pressed = { key: keyOf('create'), name: 'onPress' };

  return {
    cache,
    calls,
    runs,
    type: (text) =>
      calls.call(
        { pageState: { draft: text } },
        {
          ...typed,
          schema: schemaOf('FieldGroup.TextField', 'onChangeText'),
          payload: text,
        },
      ),
    press: () =>
      calls.call(
        { operation: 'create', args: { title: '' } },
        { ...pressed, schema: schemaOf('Button', 'onPress') },
      ),
  };
}

// Longer than a typed field's throttle.
const pause = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 400);
  });

const drafts = ({ server }: Cache): unknown[] =>
  server.requests.map(({ pageState }) => pageState.draft);

it('draws a typed field once the typing pauses, not on every keystroke', async () => {
  const page = await drafting();

  await page.type('f');
  await page.type('fi');
  await page.type('fix');
  await settled();

  expect(drafts(page.cache)).toEqual([undefined]);

  await pause();

  expect(drafts(page.cache)).toEqual([undefined, 'fix']);
});
