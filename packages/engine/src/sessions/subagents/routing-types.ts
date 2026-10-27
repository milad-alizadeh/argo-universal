import type { Database } from '@repo/db';
import type { FeedActorRef, FeedInput } from '../../feed';
import type { SessionData } from '../session-data';
import type { WriterActorRef, WriterJob } from '../../storage';

export type SubagentRouting = {
  parent: SessionData;
  parentId: string;
  database: Database;
  now: () => number;
  createId: () => string;
  writer: WriterActorRef;
  write: (job: WriterJob) => void;
  spawn: (input: FeedInput) => FeedActorRef;
  parentFeed: FeedActorRef;
  storageFailing: () => void;
};
