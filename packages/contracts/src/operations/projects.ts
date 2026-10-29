import { z } from 'zod';
import {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
} from '../projects/branches';
import { ProjectInfo } from '../projects/list';
import type { OperationDefinition } from './index';

export const projectOperations = {
  'project.list': {
    id: 'project.list',
    label: 'List Projects',
    description: 'List registered Projects and their available Checkouts.',
    params: z.strictObject({}).default({}),
    result: z.array(ProjectInfo.extend({ inScope: z.boolean().optional() })),
    tier: 'read',
    keywords: ['repositories', 'folders', 'workspaces'],
  },
  'project.listBranches': {
    id: 'project.listBranches',
    label: 'List Project branches',
    description:
      'List local branches in a Project and identify its current branch, or null for a detached HEAD.',
    params: ProjectsBranchesInput,
    result: ProjectsBranchesOutput,
    tier: 'read',
    keywords: ['git', 'checkout', 'branch'],
  },
} as const satisfies Record<string, OperationDefinition>;
