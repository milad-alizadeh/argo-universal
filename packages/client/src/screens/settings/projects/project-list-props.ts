import type { ProjectInfo } from '@repo/contracts';
import type { ReactNode } from 'react';

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
  // A narrow window's header, which the screen sets on its stack.
  renderHeader?: (header: ProjectsHeaderProps) => ReactNode;
}

// What a narrow window's header works with: the search.
export interface ProjectsHeaderProps {
  onSearch: (search: string) => void;
}

export type SearchedProps = ProjectListViewProps & {
  search: string;
  onSearch: (search: string) => void;
};

export type LoadedProps = Omit<SearchedProps, 'projects'> & {
  projects: ProjectInfo[];
};
