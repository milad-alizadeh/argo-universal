import type { Database } from '@repo/db';
import { createBlobService } from './blob';
import { createProjectService } from './projects';
import type { Services } from './services';
import type { RegistryActorRef } from './sessions';

export function createServerServices(options: {
  database: Database;
  blobsFolder: string;
  sessions: RegistryActorRef;
  createId?: () => string;
}): Services {
  return {
    blob: createBlobService(options),
    projects: createProjectService(options.database),
  };
}
