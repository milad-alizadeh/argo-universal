import type { Database } from '@repo/db';
import type { FeedActorRef, FeedInput } from '../../feed';
import type { WriterActorRef, WriterJob } from '../../storage';
import type { SessionData } from '../session-data';

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
