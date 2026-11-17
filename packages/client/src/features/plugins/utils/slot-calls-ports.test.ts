import { kitComponent } from '@repo/contracts/plugins/kit';
import type { PageRunAnswer } from '@repo/contracts/plugins/page-address';
import { madePageCall } from '@repo/contracts/plugins/page-call-payload';
import { PageCalls, type ScopedRun } from '@repo/contracts/plugins/page-calls';
import type { ReplaceableAnswer } from '@repo/contracts/plugins/replaceable';
import {
  PageCall,
  type WireJson,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import { QueryClient } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { slotCallsPorts } from './slot-calls-ports';

// A Feed row's replacement: one Retry button that shows it is retrying while its Operation runs.
const retry: WireNode = {
  type: 'Button',
  key: 'retry',
  props: {
    label: 'Retry',
    onPress: {
      operation: 'retry',
      args: {},
      optimistic: [{ key: 'retry', props: { label: 'Retrying' } }],
    },
  },
  children: [],
  slots: {},
};

const queryKey = ['plugins', 'render', 'row-1'];

const onPress = kitComponent('Button')?.events.onPress;

if (!onPress) throw new Error('Button has no onPress');

const pressed = {
  key: childNodeKey('', 'retry'),
  name: 'onPress',
  schema: onPress,
};

const retryCall = madePageCall(PageCall.parse(retry.props.onPress));

const labelOf = (client: QueryClient): WireJson | undefined => {
  const answer = client.getQueryData<ReplaceableAnswer>(queryKey);

  return answer?.type === 'replacement' ? answer.root.props.label : undefined;
};

type Slot = {
  client: QueryClient;
  calls: PageCalls;
  runs: ScopedRun[];
  failures: string[];
};

function slot(answer: () => Promise<PageRunAnswer>): Slot {
  const client = new QueryClient();
  const runs: (ScopedRun & { pluginId: string })[] = [];
  const failures: string[] = [];

  const drawn: ReplaceableAnswer = {
    type: 'replacement',
    pluginId: 'ci',
    root: retry,
  };

  client.setQueryData(queryKey, drawn);

  const calls = new PageCalls(
    slotCallsPorts(
      { client, queryKey },
      {
        pluginId: 'ci',
        session: { sessionId: 'session-1', projectId: 'argo' },
      },
      {
        run: (run) => {
          runs.push(run);

          return answer();
        },
        failed: (error) => failures.push(error.message),
      },
    ),
  );

  return { client, calls, runs, failures };
}

it('runs a replacement’s Operation for the Session and Project its row is in, showing its optimistic props', async () => {
  const answer = Promise.withResolvers<PageRunAnswer>();
  const { client, calls, runs } = slot(() => answer.promise);

  const press = calls.call(retryCall, pressed);

  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(runs).toEqual([
    {
      pluginId: 'ci',
      operation: 'retry',
      args: {},
      sessionId: 'session-1',
      projectId: 'argo',
    },
  ]);
  expect(labelOf(client)).toBe('Retrying');

  answer.resolve({ result: null });
  await press;
});

it('puts the replacement back and says why when its Operation fails', async () => {
  const { client, calls, failures } = slot(() =>
    Promise.reject(new Error('Only a Session can run retry')),
  );

  await calls.call(retryCall, pressed);

  expect(labelOf(client)).toBe('Retry');
  expect(failures).toEqual(['Only a Session can run retry']);
});
