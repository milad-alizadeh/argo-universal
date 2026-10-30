import type { ProjectInfo } from '@repo/contracts';

export type ProjectsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; projects: ProjectInfo[] };

export interface ProjectListViewProps {
  caption?: string;
  projects: ProjectsLoad;
  onOpenProject: (name: string) => void;
  // Where the search starts, for stories.
  initialSearch?: string;
}

export type SearchedProps = ProjectListViewProps & {
  search: string;
  onSearch: (search: string) => void;
};

export type LoadedProps = Omit<SearchedProps, 'projects'> & {
  projects: ProjectInfo[];
  // The Projects have not arrived: no rows is not yet "none", so the page says nothing about them.
  loading?: boolean;
};
