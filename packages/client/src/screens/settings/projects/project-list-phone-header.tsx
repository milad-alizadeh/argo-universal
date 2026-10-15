import type * as React from 'react';
import {
  ScreenHeader,
  type ScreenHeaderProps,
} from '#lib/product/navigation/screen-header';
import type { ProjectsHeaderProps } from './project-list-props';
import { projectsTitle, searchLabel } from './project-list-search';

// A narrow web window's header row: the title and Search.
export const projectsHeader = ({
  onSearch,
}: ProjectsHeaderProps): ScreenHeaderProps => ({
  title: projectsTitle,
  search: { placeholder: searchLabel, onChangeText: onSearch },
});

export function ProjectsPhoneHeader(
  props: ProjectsHeaderProps,
): React.JSX.Element | null {
  return <ScreenHeader {...projectsHeader(props)} />;
}
