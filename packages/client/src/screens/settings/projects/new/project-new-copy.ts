import type { ProjectSource } from '#features/settings';

// The two ways to add a Project; starting a new repository is not part of this form.
export const sources: ProjectSource[] = ['folder', 'clone'];

export const sourceCopy = {
  folder: {
    label: 'Existing Folder',
    field: 'Folder',
    placeholder: '/Users/you/Developer/app',
    footer:
      'A folder on the Server, anywhere inside a git repository. The Server registers the repository that holds it.',
    action: 'Add Project',
    pending: 'Adding…',
  },
  clone: {
    label: 'Clone Repository',
    field: 'Repository URL',
    placeholder: 'https://github.com/owner/repo.git',
    footer: 'The Server clones this repository into its Projects folder.',
    action: 'Clone Project',
    pending: 'Cloning…',
  },
} satisfies Record<
  ProjectSource,
  {
    label: string;
    field: string;
    placeholder: string;
    footer: string;
    action: string;
    pending: string;
  }
>;
