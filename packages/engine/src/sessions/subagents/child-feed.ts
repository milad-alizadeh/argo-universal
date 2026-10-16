import { session } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { type FeedActorRef } from '../../feed';
import { SessionInsertJob } from '../session-storage';
import { activeChildTurn } from './active-turn';
import { childFeedInput } from './feed-input';
import type { SubagentRouting } from './routing-types';

export type ChildFeed = {
  sessionId: string;
  parentId: string;
  feed: FeedActorRef;
  turnId: string | null;
};

const storedChild = (
  input: SubagentRouting,
  vendorId: string,
): typeof session.$inferSelect | undefined =>
  input.database
    .select()
    .from(session)
    .where(
      and(
        eq(session.parentSessionId, input.parentId),
        eq(session.vendorSessionId, vendorId),
      ),
    )
    .get();

const childInsert = (
  input: SubagentRouting,
  identity: { sessionId: string; vendorId: string },
): SessionInsertJob =>
  new SessionInsertJob({
    session: {
      id: identity.sessionId,
      parentSessionId: input.parentId,

      ...parentFields(input),
      vendorSessionId: identity.vendorId,

      projectionVersion: 1,
    },
  });

type FeedIdentity = { sessionId: string; epoch: number; maxRevision: number };

function storedIdentity(
  stored: typeof session.$inferSelect | undefined,
  createId: () => string,
): FeedIdentity {
  if (!stored) return { sessionId: createId(), epoch: 0, maxRevision: 0 };

  return {
    sessionId: stored.id,
    epoch: stored.epoch,
    maxRevision: stored.maxRevision,
  };
}

// `spawned` says the Subagent is new rather than stored before a restart or resume.
export type OpenedChildFeed = { child: ChildFeed; spawned: boolean };

const childFeed = (
  input: SubagentRouting,
  identity: FeedIdentity,
): ChildFeed => ({
  sessionId: identity.sessionId,
  parentId: input.parentId,
  feed: input.spawn(childFeedInput(input, identity)),
  turnId: activeChildTurn(input, identity.sessionId),
});

export function openChildFeed(
  input: SubagentRouting,
  vendorId: string,
): OpenedChildFeed {
  const stored = storedChild(input, vendorId);
  const identity = storedIdentity(stored, input.createId);
  const { sessionId } = identity;

  if (!stored) input.write(childInsert(input, { sessionId, vendorId }));

  return { child: childFeed(input, identity), spawned: !stored };
}

const parentFields = (
  input: SubagentRouting,
): Pick<
  typeof session.$inferInsert,
  'agent' | 'projectId' | 'checkoutPath' | 'checkoutBranch'
> => ({
  agent: input.parent.agent,
  projectId: input.parent.projectId,
  checkoutPath: input.parent.checkout.path,
  checkoutBranch: input.parent.checkout.branch,
});
