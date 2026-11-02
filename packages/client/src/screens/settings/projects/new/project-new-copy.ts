import type { ProjectSource } from '#features/settings';

interface SourceCopy {
  label: string;
  field: string;
  placeholder: string;
  footer: string;
}

// What each way of adding a Project asks for, and says about it.
export const sourceCopy: Record<ProjectSource, SourceCopy> = {
  folder: {
    label: 'Folder',
    field: 'Folder',
    placeholder: '/Users/you/Developer/app',
    footer:
      'A folder on the Server, anywhere inside a git repository. The Server registers the repository that holds it.',
  },
  clone: {
    label: 'Clone',
    field: 'Repository',
    placeholder: 'https://github.com/owner/repo.git',
    footer:
      'The Server clones this repository into its Projects folder and registers the clone.',
  },
  new: {
    label: 'New',
    field: 'Name',
    placeholder: 'my-project',
    footer:
      'The Server starts an empty git repository with this name in its Projects folder.',
  },
};

export const sources: ProjectSource[] = ['folder', 'clone', 'new'];
