import { blob, session } from '@repo/db/schema';
import { sql, type SQL } from 'drizzle-orm';

// A paused Queued Prompt keeps its attachments even when it waits longer than the upload cleanup window.
export function noQueuedBlobReference(): SQL {
  return sql`not exists (
    select 1 from ${session},
      json_each(${session.promptQueue}, '$.items') as queued_prompt,
      json_each(queued_prompt.value, '$.prompt') as queued_content
    where json_extract(queued_content.value, '$.blob.blobId') = ${blob.id}
  )`;
}
