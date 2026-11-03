import { z } from 'zod';
import {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
} from '../projects/branches';
import { ProjectInfo } from '../projects/list';
import { ProjectUpdateInput } from '../projects/update';
import type { OperationDefinition } from './index';

// What adding a Project answers: the Project that now holds the folder.
export const ProjectAdded = z.strictObject({ projectId: z.string() });

export type ProjectAdded = z.infer<typeof ProjectAdded>;

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
  'project.add': {
    id: 'project.add',
    label: 'Add Project',
    description:
      'Register the git repository that holds a folder on the Server as a Project.',
    params: z.strictObject({
      path: z.string().min(1).describe('A folder inside the repository.'),
    }),
    result: ProjectAdded,
    tier: 'confirm',
    keywords: ['register', 'repository', 'folder', 'new'],
  },
  'project.clone': {
    id: 'project.clone',
    label: 'Clone Project',
    description:
      "Clone a git repository from a URL into the Server's Projects folder and register it as a Project.",
    params: z.strictObject({ url: z.string().min(1) }),
    result: ProjectAdded,
    tier: 'confirm',
    keywords: ['github', 'git clone', 'repository', 'new'],
  },
  'project.create': {
    id: 'project.create',
    label: 'Create Project',
    description:
      "Start a new git repository in the Server's Projects folder and register it as a Project.",
    params: z.strictObject({ name: z.string().min(1) }),
    result: ProjectAdded,
    tier: 'confirm',
    keywords: ['new', 'init', 'repository', 'folder'],
  },
  'project.update': {
    id: 'project.update',
    label: 'Update Project',
    description:
      "Change where a Project's next Session starts, and whether archiving its Sessions deletes their worktrees.",
    params: ProjectUpdateInput,
    result: ProjectInfo,
    tier: 'confirm',
    keywords: ['settings', 'worktree', 'base branch', 'archive', 'checkout'],
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
