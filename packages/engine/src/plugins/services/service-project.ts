import { CapabilityRefusal } from '../access/capability-refusal';
import type { StateRequest } from './plugin-calls';

type ProjectRequest = StateRequest & { projectId?: string };

const namedProject = (request: ProjectRequest): string | undefined =>
  request.api === 'fetch' ? request.call.projectId : undefined;

// A fetch may name its Project, which then decides the Account it borrows (ADR-0037).
export async function projectOf(
  request: ProjectRequest,
  projectIds: () => Promise<string[]>,
): Promise<string | undefined> {
  const named = namedProject(request);

  if (named === undefined) return request.projectId;

  if (!(await projectIds()).includes(named))
    throw new CapabilityRefusal('Project is unavailable');

  return named;
}
