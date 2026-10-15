import type * as React from 'react';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import type { ProjectsHeaderProps } from './project-list-props';
import { projectsTitle, searchLabel } from './project-list-search';

// A phone's native header: the title and the stack's search bar.
export function ProjectsPhoneHeader({
  onSearch,
}: ProjectsHeaderProps): React.JSX.Element {
  return (
    <>
      <ScreenHeader title={projectsTitle} />
      <PhoneSearchBar placeholder={searchLabel} onSearch={onSearch} />
    </>
  );
}
