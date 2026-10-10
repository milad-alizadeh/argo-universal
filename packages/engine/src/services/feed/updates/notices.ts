import type { Notice as AcpNotice } from '@agentclientprotocol/sdk';
import { knownNoticeSeverities, type FeedUpdate } from '@repo/contracts';
import type { AssembledContent } from './assembly';
import { createAcpContentMetadata } from './content';
import { createScopedFeedRowId } from './identity';

type NoticeIdentity = { acpSessionId: string; localPosition: number };
const noticeSeverities: ReadonlySet<string> = new Set(knownNoticeSeverities);
const createNoticeRow = (
  notice: AcpNotice,
  identity: NoticeIdentity,
): FeedUpdate => ({
  id: createScopedFeedRowId({ ...identity, kind: 'notice' }),
  sessionUpdate: 'notice',
  state: 'settled',
  severity: notice.severity,
  title: notice.title,
  description: notice.description ?? undefined,
  _meta: createAcpContentMetadata(notice._meta),
});
export const createNoticeChange = (
  notice: AcpNotice,
  identity: NoticeIdentity,
): AssembledContent => ({
  change: { type: 'upsert', update: createNoticeRow(notice, identity) },
  diagnostics: noticeSeverities.has(notice.severity)
    ? []
    : [`Unknown notice severity: ${notice.severity}`],
});
