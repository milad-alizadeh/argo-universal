import type { ActorRefFrom } from 'xstate';
import type { WriterJob } from './writer-job';
import type { writerMachine } from './writer-machine';

export async function writeDatabaseJobAndWaitForCommit(
  writer: ActorRefFrom<typeof writerMachine>,
  job: WriterJob,
): Promise<void> {
  if (writer.getSnapshot().status !== 'active')
    throw new Error('Database Writer is not available');
  const committed = Promise.withResolvers<void>();
  writer.send({ type: 'writer.write', job, committed });
  await committed.promise;
}
