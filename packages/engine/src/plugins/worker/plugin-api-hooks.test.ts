import type { HookEvent } from '@repo/contracts/plugins';
import type { JsonObject } from '@repo/contracts/plugins/hook-protocol';
import { createElement } from 'react';
import { expect, it, vi } from 'vitest';
import { fakeBridge, settled } from '../../../mocks/plugin-bridge';
import { createPluginApi } from './create-plugin-api';

const surface = { platform: 'web', parts: { Text: 1 } };

const toolCall = {
  slotId: 'argo/feed/tool-call/v1',
  props: { row: { id: 'tool-1' } },
};

type Invocation = { name: string; event: JsonObject };

const sessionStart = { sessionId: 'session-1' };

const started = 'session.start';

// The worker passing the Plugin's first Hook one event, as the Server asked it to.
function invoke(inbox: (json: string) => void, invocation: Invocation): void {
  inbox(JSON.stringify({ invocation: 7, hookId: 0, surface, ...invocation }));
}

it('settles a ui.render Hook that returns kit components with its replacement tree', async () => {
  const { bridge, requests } = fakeBridge();
  const { argo, inboxes } = createPluginApi(bridge);

  const seen =
    vi.fn<
      (frozen: boolean[], props: HookEvent<'ui.render'>['props']) => void
    >();

  await argo.on('ui.render', 'argo/feed/tool-call/v1', (context, event) => {
    seen([Object.isFrozen(context), Object.isFrozen(event)], context.props);

    return createElement('Text', null, 'Replaced');
  });

  invoke(inboxes.hooks, { name: 'ui.render', event: toolCall });

  await vi.waitFor(() =>
    expect(settled(requests)).toEqual({
      api: 'hooks',
      call: {
        action: 'settle',
        invocation: 7,
        outcome: { ok: true, answer: { treePath: 'render:7' } },
      },
    }),
  );
  expect(seen).toHaveBeenCalledWith([true, true], toolCall.props);
});

it('registers each Hook under its count, with its matcher and guard', async () => {
  const { bridge, requests } = fakeBridge();
  const { argo } = createPluginApi(bridge);

  await argo.on('tool.check', () => ({ decision: 'deny' }), { guard: true });
  await argo.on('process.spawn', 'gh', (_context, event) => event);

  expect(requests).toEqual([
    {
      api: 'hooks',
      call: { action: 'register', hookId: 0, name: 'tool.check', guard: true },
    },
    {
      api: 'hooks',
      call: {
        action: 'register',
        hookId: 1,
        name: 'process.spawn',
        matcher: 'gh',
        guard: false,
      },
    },
  ]);
});

const nextAnswers = [
  {
    case: 'answers with what next resolved to',
    chain: { prompt: [{ type: 'text', text: 'core' }] },
    outcome: {
      ok: true,
      answer: { prompt: [{ type: 'text', text: 'core' }] },
    },
  },
  {
    case: 'passes on when next answered nothing',
    chain: null,
    outcome: { ok: true },
  },
];

it.each(nextAnswers)(
  'a Hook that rewrites its event $case',
  async ({ chain, outcome }) => {
    const { bridge, requests } = fakeBridge((request) =>
      request.api === 'hooks' && request.call.action === 'next' ? chain : null,
    );

    const { argo, inboxes } = createPluginApi(bridge);

    await argo.on('prompt.submit', async (_context, event, next) => {
      const answer = await next({ ...event, sessionId: 'rewritten' });

      return answer ?? undefined;
    });

    invoke(inboxes.hooks, { name: 'prompt.submit', event: sessionStart });

    await vi.waitFor(() =>
      expect(settled(requests)).toEqual({
        api: 'hooks',
        call: { action: 'settle', invocation: 7, outcome },
      }),
    );
    expect(requests).toContainEqual({
      api: 'hooks',
      call: {
        action: 'next',
        invocation: 7,
        event: { sessionId: 'rewritten' },
      },
    });
  },
);

it('passes the event on as it came when next gets nothing', async () => {
  const { bridge, requests } = fakeBridge();
  const { argo, inboxes } = createPluginApi(bridge);

  await argo.on(started, (_context, _event, next) => next());

  invoke(inboxes.hooks, { name: started, event: sessionStart });

  await vi.waitFor(() =>
    expect(requests).toContainEqual({
      api: 'hooks',
      call: { action: 'next', invocation: 7, event: sessionStart },
    }),
  );
});

it('settles a Hook that throws with its message', async () => {
  const { bridge, requests } = fakeBridge();
  const { argo, inboxes } = createPluginApi(bridge);

  await argo.on(started, () => {
    throw new Error('Hook failed');
  });

  invoke(inboxes.hooks, { name: started, event: sessionStart });

  await vi.waitFor(() =>
    expect(settled(requests)).toEqual({
      api: 'hooks',
      call: {
        action: 'settle',
        invocation: 7,
        outcome: { ok: false, error: 'Hook failed' },
      },
    }),
  );
});
