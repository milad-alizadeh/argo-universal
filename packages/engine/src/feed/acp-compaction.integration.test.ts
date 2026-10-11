import { expect, it, vi } from 'vitest';
import { openAcpFeedSession } from '#mocks/acp-feed';

const equalNoticeTitle = 'Same notice';

it('Compaction chunks remain live until completion and an omitted terminal summary retains accepted content', async () => {
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'compaction_update',
      compactionId: 'compact-1',
      status: 'in_progress',
      _meta: { scope: 'initial' },
    },
    {
      sessionUpdate: 'compaction_summary_chunk',
      compactionId: 'compact-1',
      content: { type: 'text', text: 'Keep ' },
    },
    {
      sessionUpdate: 'compaction_summary_chunk',
      compactionId: 'compact-1',
      content: { type: 'text', text: 'context' },
    },
    {
      sessionUpdate: 'compaction_update',
      compactionId: 'compact-1',
      status: 'completed',
    },
  ]);
  expect(
    (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows,
  ).toMatchObject([
    { sessionUpdate: 'user_message' },
    {
      sessionUpdate: 'compaction_update',
      position: 1,
      state: 'settled',
      status: 'completed',
      summary: [
        { type: 'text', text: 'Keep ' },
        { type: 'text', text: 'context' },
      ],
      _meta: { acp: { scope: 'initial' } },
    },
  ]);
});

it('Compaction null and empty patches clear retained values while failure detail remains visible', async () => {
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'compaction_update',
      compactionId: 'compact-1',
      status: 'completed',
      summary: [{ type: 'text', text: 'Old summary' }],
      _meta: { scope: 'old' },
    },
    {
      sessionUpdate: 'compaction_update',
      compactionId: 'compact-1',
      status: 'failed',
      error: 'Too much context',
    },
    {
      sessionUpdate: 'compaction_update',
      compactionId: 'compact-1',
      status: 'failed',
      summary: null,
      error: null,
      _meta: null,
    },
    {
      sessionUpdate: 'compaction_update',
      compactionId: 'compact-1',
      status: 'failed',
      summary: [],
      error: 'Retry failed',
      _meta: { scope: 'replacement' },
    },
  ]);
  expect(
    (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows[1],
  ).toMatchObject({
    status: 'failed',
    state: 'settled',
    error: 'Retry failed',
    summary: [],
    _meta: { acp: { scope: 'replacement' } },
    position: 1,
  });
});

it('SDK-valid future Notice severity and Compaction status remain explicit with one diagnostic each', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'notice',
      severity: 'future-severity',
      title: 'Future notice',
    },
    {
      sessionUpdate: 'notice',
      severity: 'info',
      title: equalNoticeTitle,
      description: null,
    },
    { sessionUpdate: 'notice', severity: 'info', title: equalNoticeTitle },
    {
      sessionUpdate: 'compaction_update',
      compactionId: 'future',
      status: 'future-status',
    },
  ]);
  expect(
    (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows,
  ).toMatchObject([
    { sessionUpdate: 'user_message' },
    {
      sessionUpdate: 'notice',
      severity: 'future-severity',
      title: 'Future notice',
      state: 'settled',
    },
    { sessionUpdate: 'notice', title: equalNoticeTitle, position: 2 },
    { sessionUpdate: 'notice', title: equalNoticeTitle, position: 3 },
    {
      sessionUpdate: 'compaction_update',
      status: 'future-status',
      state: 'settled',
    },
  ]);
  expect(errors).toHaveBeenCalledTimes(2);
  errors.mockRestore();
});
