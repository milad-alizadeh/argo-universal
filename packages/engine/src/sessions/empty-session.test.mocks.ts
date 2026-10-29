import { project } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

export const projectPathFor = (host: AcpEngine): string | undefined =>
  host.database
    .select({ path: project.path })
    .from(project)
    .where(eq(project.id, emptySessionInput.projectId))
    .get()?.path;
